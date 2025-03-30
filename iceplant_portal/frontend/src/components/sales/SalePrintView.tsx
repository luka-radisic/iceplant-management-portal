import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Divider, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { Sale } from '../../types/sales';
import { CompanySettings, defaultCompanySettings } from '../../types/company';
import { apiService, endpoints } from '../../services/api';
import PrintIcon from '@mui/icons-material/Print';

const SalePrintView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);

  useEffect(() => {
    // Load company settings
    const fetchCompanySettings = async () => {
      try {
        const response = await apiService.getCompanySettings();
        setCompanySettings(response);
      } catch (err) {
        console.error("Error fetching company settings:", err);
        // Use defaults if settings can't be loaded
      }
    };
    
    fetchCompanySettings();
    
    // First try to get the sale from localStorage (set when clicking from the table)
    const storedSale = localStorage.getItem('printSale');
    if (storedSale) {
      try {
        setSale(JSON.parse(storedSale));
        setLoading(false);
        // Clear the stored sale to avoid stale data
        localStorage.removeItem('printSale');
        return;
      } catch (err) {
        console.error("Error parsing stored sale:", err);
        // If there's an error parsing, we'll fall back to API fetch
      }
    }
    
    // If we get here, we need to fetch the sale from the API
    const fetchSale = async () => {
      if (!id) {
        setError("Sale ID is missing");
        setLoading(false);
        return;
      }
      
      try {
        const response = await apiService.get(`${endpoints.sales}${id}/`);
        setSale(response);
      } catch (err) {
        console.error("Error fetching sale:", err);
        setError("Failed to load sale data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSale();
  }, [id]);

  // Format currency in Philippine Peso
  const formatCurrency = (value: number | string): string => {
    if (value === null || value === undefined || value === '') return 'N/A';
    
    // Convert to number
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    
    // Format the number with thousand separators and 2 decimal places
    const formattedNumber = numValue.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Explicitly prepend the Philippine Peso symbol
    return `₱${formattedNumber}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <Typography>Loading sale details...</Typography>
      </Box>
    );
  }

  if (error || !sale) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <Typography color="error">{error || "Sale not found"}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      p: 4,
      '@media print': {
        p: 0
      }
    }}>
      {/* Print Button - Only shows on screen, hidden when printing */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        mb: 2,
        '@media print': {
          display: 'none'
        }
      }}>
        <Button 
          variant="contained" 
          startIcon={<PrintIcon />} 
          onClick={handlePrint}
        >
          Print
        </Button>
      </Box>
      
      <Paper sx={{ 
        p: 4,
        '@media print': {
          boxShadow: 'none',
          p: 0
        }
      }}>
        {/* Header */}
        <Grid container spacing={2}>
          {/* Logo */}
          <Grid item xs={4}>
            {companySettings.logo_url ? (
              <Box 
                component="img" 
                src={companySettings.logo_url}
                alt={companySettings.company_name}
                sx={{ 
                  height: 100, 
                  maxWidth: 200, 
                  objectFit: 'contain' 
                }}
              />
            ) : (
              <Box 
                sx={{ 
                  height: '100px', 
                  width: '200px', 
                  border: '1px dashed #ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography color="textSecondary">Logo</Typography>
              </Box>
            )}
          </Grid>
          
          {/* Company Info */}
          <Grid item xs={8} sx={{ textAlign: 'right' }}>
            <Typography variant="h5">{companySettings.company_name}</Typography>
            {companySettings.company_address_line1 && (
              <Typography>{companySettings.company_address_line1}</Typography>
            )}
            {companySettings.company_address_line2 && (
              <Typography>{companySettings.company_address_line2}</Typography>
            )}
            <Typography>
              {companySettings.company_city && `${companySettings.company_city}, `}
              {companySettings.company_state && `${companySettings.company_state} `}
              {companySettings.company_postal_code && companySettings.company_postal_code}
            </Typography>
            <Typography>{companySettings.company_country}</Typography>
            {companySettings.phone_number && (
              <Typography>Tel: {companySettings.phone_number}</Typography>
            )}
            {companySettings.email && (
              <Typography>Email: {companySettings.email}</Typography>
            )}
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Receipt Title */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4">SALES INVOICE</Typography>
          <Typography variant="subtitle1" color="primary" fontWeight="bold">
            SI #{sale.si_number}
          </Typography>
        </Box>
        
        {/* Sale Details */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Buyer Information:</Typography>
            <Typography variant="body1" fontWeight="bold">{sale.buyer_name}</Typography>
            {sale.buyer && (
              <>
                {sale.buyer.company_name && (
                  <Typography variant="body2">Company: {sale.buyer.company_name}</Typography>
                )}
                {sale.buyer.phone && (
                  <Typography variant="body2">Phone: {sale.buyer.phone}</Typography>
                )}
                {sale.buyer.email && (
                  <Typography variant="body2">Email: {sale.buyer.email}</Typography>
                )}
              </>
            )}
            {(!sale.buyer || (!sale.buyer.phone && !sale.buyer.email)) && sale.buyer_contact && (
              <Typography variant="body2">Contact: {sale.buyer_contact}</Typography>
            )}
          </Grid>
          
          <Grid item xs={6} sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle2">Sale Details:</Typography>
            <Typography variant="body2">Date: {sale.sale_date}</Typography>
            <Typography variant="body2">Time: {sale.sale_time}</Typography>
            {sale.po_number && (
              <Typography variant="body2">PO Number: {sale.po_number}</Typography>
            )}
          </Grid>
        </Grid>
        
        {/* Items Table */}
        <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><Typography fontWeight="bold">Item Description</Typography></TableCell>
                <TableCell align="right"><Typography fontWeight="bold">Quantity</Typography></TableCell>
                <TableCell align="right"><Typography fontWeight="bold">Unit Price</Typography></TableCell>
                <TableCell align="right"><Typography fontWeight="bold">Amount</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sale.pickup_quantity > 0 && (
                <TableRow>
                  <TableCell>Ice Blocks (Pickup)</TableCell>
                  <TableCell align="right">{sale.pickup_quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(sale.price_per_block)}</TableCell>
                  <TableCell align="right">{formatCurrency(sale.pickup_quantity * parseFloat(String(sale.price_per_block)))}</TableCell>
                </TableRow>
              )}
              {sale.delivery_quantity > 0 && (
                <TableRow>
                  <TableCell>Ice Blocks (Delivery)</TableCell>
                  <TableCell align="right">{sale.delivery_quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(sale.price_per_block)}</TableCell>
                  <TableCell align="right">{formatCurrency(sale.delivery_quantity * parseFloat(String(sale.price_per_block)))}</TableCell>
                </TableRow>
              )}
              
              {/* Totals */}
              <TableRow>
                <TableCell colSpan={2} rowSpan={3} sx={{ borderBottom: 'none' }}>
                  {sale.notes && (
                    <Box>
                      <Typography variant="subtitle2">Notes:</Typography>
                      <Typography variant="body2">{sale.notes}</Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell align="right"><Typography fontWeight="bold">Sub Total:</Typography></TableCell>
                <TableCell align="right">{formatCurrency(sale.total_cost)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="right"><Typography fontWeight="bold">Total Paid:</Typography></TableCell>
                <TableCell align="right">{formatCurrency(parseFloat(String(sale.cash_amount)) + parseFloat(String(sale.po_amount)))}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="right" sx={{ borderBottom: 'none' }}>
                  <Typography fontWeight="bold">Payment Status:</Typography>
                </TableCell>
                <TableCell align="right" sx={{ borderBottom: 'none' }}>
                  <Typography 
                    fontWeight="bold" 
                    color={sale.payment_status === 'Paid' ? 'success.main' : 
                          sale.payment_status === 'Partially Paid' ? 'warning.main' : 'error.main'}
                  >
                    {sale.payment_status}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Payment Details */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2">Payment Details:</Typography>
            {sale.cash_amount > 0 && (
              <Typography variant="body2">Cash: {formatCurrency(sale.cash_amount)}</Typography>
            )}
            {sale.po_amount > 0 && (
              <Typography variant="body2">PO Amount: {formatCurrency(sale.po_amount)}</Typography>
            )}
          </Grid>
          
          <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle2">Sale Status:</Typography>
            <Typography 
              fontWeight="bold" 
              color={sale.status === 'processed' ? 'success.main' : 
                    sale.status === 'canceled' ? 'error.main' : 'warning.main'}
            >
              {sale.status.toUpperCase()}
            </Typography>
          </Grid>
        </Grid>
        
        {/* Footer */}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ textAlign: 'center' }}>
          {companySettings.invoice_footer_text ? (
            <Typography variant="body2" color="textSecondary">
              {companySettings.invoice_footer_text}
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary">
                Thank you for your business!
              </Typography>
              <Typography variant="caption" color="textSecondary">
                This is a computer-generated document. No signature is required.
              </Typography>
            </>
          )}
          {companySettings.tax_id && (
            <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 1 }}>
              Tax ID: {companySettings.tax_id}
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default SalePrintView; 