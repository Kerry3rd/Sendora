import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Radio,
  FormControlLabel,
  RadioGroup
} from '@mui/material';
import { PRICING } from '../../config/pricing';
import { formatCostInTZS, formatAvgCostInTZS } from '../../utils/currency';

interface Package {
  id: string;
  credits: number;
  price: number;
  pricePerSMS: number;
}

interface CreditPackagesProps {
  packages: Package[];
  selectedPackage: string;
  onSelect: (packageId: string) => void;
  showSavings?: boolean;
}

const CreditPackages: React.FC<CreditPackagesProps> = ({
  packages,
  selectedPackage,
  onSelect,
  showSavings = true,
}) => {
  const getSavingsPercentage = (pkg: Package) => {
    const paygRate = PRICING.tanzania.payg;
    const paygCost = pkg.credits * paygRate;
    const savings = ((paygCost - pkg.price) / paygCost) * 100;
    return Math.round(savings);
  };

  return (
    <RadioGroup value={selectedPackage} onChange={(e) => onSelect(e.target.value)}>
      <Grid container spacing={3}>
        {packages.map((pkg) => {
          const savings = getSavingsPercentage(pkg);
          return (
            <Grid item xs={12} sm={6} md={3} key={pkg.id}>
              <Card
                sx={{
                  height: '100%',
                  position: 'relative',
                  border: selectedPackage === pkg.id ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3,
                  },
                }}
                onClick={() => onSelect(pkg.id)}
              >
                {pkg.id === 'popular' && (
                  <Chip
                    label="MOST POPULAR"
                    color="primary"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: 10,
                    }}
                  />
                )}
                {showSavings && savings > 0 && (
                  <Chip
                    label={`Save ${savings}%`}
                    color="success"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -10,
                      left: 10,
                    }}
                  />
                )}
                <CardContent>
                  <FormControlLabel
                    value={pkg.id}
                    control={<Radio />}
                    label={
                      <Box sx={{ ml: 1 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {pkg.credits.toLocaleString()} Credits
                        </Typography>
                        <Typography variant="h5" color="primary.main" fontWeight="bold">
                          {formatCostInTZS(pkg.price)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatAvgCostInTZS(pkg.pricePerSMS)} per SMS
                          </Typography>
                          {showSavings && (
                            <Chip
                              label={`${Math.round((PRICING.tanzania.payg - pkg.pricePerSMS) / PRICING.tanzania.payg * 100)}% cheaper`}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ fontSize: '0.6rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                    }
                    sx={{ m: 0 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </RadioGroup>
  );
};

export default CreditPackages;