import React, { useState, useEffect } from 'react';
import { Box, Typography, styled } from '@mui/material';
import { apiService } from '../../services/api';

const LogoImage = styled('img')({
  height: 40,
  marginRight: 10,
});

const AppBarLogo: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('Ice Plant');

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const settings = await apiService.getCompanySettings();
        if (settings && settings.logo_url) {
          setLogoUrl(settings.logo_url);
        }
        if (settings && settings.company_name) {
          setCompanyName(settings.company_name);
        }
      } catch (error) {
        console.error('Error fetching company logo:', error);
      }
    };

    fetchCompanySettings();
  }, []);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {logoUrl ? (
        <LogoImage src={logoUrl} alt={companyName} />
      ) : null}
      <Typography
        variant="h6"
        noWrap
        component="div"
        sx={{ display: { xs: 'none', sm: 'block' } }}
      >
        {companyName}
      </Typography>
    </Box>
  );
};

export default AppBarLogo; 