import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import juice from 'juice';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateData {
  [key: string]: any;
  year?: number;
  date?: string;
  time?: string;
}

export class EmailTemplatesService {
  private static instance: EmailTemplatesService;
  // Use Handlebars.TemplateDelegate instead of custom type
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private layouts: Map<string, string> = new Map();
  
  // Default template directory
  private templateDir = path.join(__dirname, '../../templates/email');

  private constructor() {
    this.registerHelpers();
    this.loadTemplates();
  }

  public static getInstance(): EmailTemplatesService {
    if (!EmailTemplatesService.instance) {
      EmailTemplatesService.instance = new EmailTemplatesService();
    }
    return EmailTemplatesService.instance;
  }

  private registerHelpers() {
    // Format date helper
    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      return new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(this: any, arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Math helper
    Handlebars.registerHelper('add', (a: number, b: number) => a + b);
    
    // JSON stringify helper
    Handlebars.registerHelper('json', (context: any) => JSON.stringify(context));
  }

  private loadTemplates() {
    try {
      // Ensure template directory exists
      if (!fs.existsSync(this.templateDir)) {
        fs.mkdirSync(this.templateDir, { recursive: true });
      }

      // Ensure layouts directory exists
      const layoutsDir = path.join(this.templateDir, 'layouts');
      if (!fs.existsSync(layoutsDir)) {
        fs.mkdirSync(layoutsDir, { recursive: true });
      }

      // Load base layout
      const layoutPath = path.join(layoutsDir, 'base.html');
      if (fs.existsSync(layoutPath)) {
        this.layouts.set('base', fs.readFileSync(layoutPath, 'utf-8'));
      } else {
        // Create default layout if doesn't exist
        this.createDefaultLayout();
      }

      // Load all templates from templates directory
      const templateFiles = fs.readdirSync(this.templateDir)
        .filter(file => file.endsWith('.html') && !file.includes('layouts'));

      templateFiles.forEach(file => {
        const templateName = path.basename(file, '.html');
        const content = fs.readFileSync(path.join(this.templateDir, file), 'utf-8');
        this.templates.set(templateName, Handlebars.compile(content));
      });

      // Always have at least a default template
      if (!this.templates.has('default')) {
        this.createDefaultTemplate();
      }

    } catch (error) {
      console.error('Error loading email templates:', error);
      this.createDefaultTemplate();
    }
  }

  private createDefaultLayout() {
    const defaultLayout = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      padding: 30px 20px;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #6c757d;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 0;
    }
    .button:hover {
      background: #5a67d8;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 10px;
        width: auto !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{appName}}</h1>
    </div>
    <div class="content">
      {{{body}}}
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{appName}}. All rights reserved.</p>
      <p>
        <a href="{{unsubscribeUrl}}">Unsubscribe</a> |
        <a href="{{privacyUrl}}">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    const layoutsDir = path.join(this.templateDir, 'layouts');
    fs.writeFileSync(path.join(layoutsDir, 'base.html'), defaultLayout);
    this.layouts.set('base', defaultLayout);
  }

  private createDefaultTemplate() {
    const defaultTemplate = `<h2>Hello {{firstName}}!</h2>
<p>{{message}}</p>
{{#if actionUrl}}
<p style="text-align: center;">
  <a href="{{actionUrl}}" class="button">{{actionText}}</a>
</p>
{{/if}}
<p>Best regards,<br>{{appName}} Team</p>`;

    fs.writeFileSync(path.join(this.templateDir, 'default.html'), defaultTemplate);
    this.templates.set('default', Handlebars.compile(defaultTemplate));
  }

  public async renderTemplate(
    templateName: string,
    data: TemplateData,
    layout: string = 'base'
  ): Promise<EmailTemplate> {
    // Get template or use default
    const template = this.templates.get(templateName) || this.templates.get('default')!;
    
    // Add common data
    const enrichedData = {
      ...data,
      year: new Date().getFullYear(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      appName: process.env.APP_NAME || 'Your App',
      unsubscribeUrl: data.unsubscribeUrl || '#',
      privacyUrl: data.privacyUrl || '#',
    };

    // Render body content
    let html = template(enrichedData);

    // Apply layout if available
    const layoutTemplate = this.layouts.get(layout);
    if (layoutTemplate) {
      const layoutFn = Handlebars.compile(layoutTemplate);
      html = layoutFn({ ...enrichedData, body: html });
    }

    // Inline CSS for better email client compatibility
    html = juice(html);

    // Generate plain text version
    const { convert } = await import('html-to-text');
    const text = convert(html, {
      wordwrap: 130,
      selectors: [
        { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
        { selector: 'img', format: 'skip' }
      ]
    });

    // Extract subject from first h1 or use provided subject
    const subjectMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/);
    const subject = data.subject || (subjectMatch ? subjectMatch[1] : 'New message from ' + process.env.APP_NAME);

    return { subject, html, text };
  }

  public async createTemplate(templateName: string, content: string): Promise<void> {
    const templatePath = path.join(this.templateDir, `${templateName}.html`);
    fs.writeFileSync(templatePath, content);
    this.templates.set(templateName, Handlebars.compile(content));
  }

  public listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}