import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  CircularProgress,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { apiService, endpoints } from '../../services/api';

// Define an interface for the form data based on the model
interface SaleFormData {
  si_number: string;
  sale_date: string; // Use string for date input, convert later
  sale_time: string; // Use string for time input, convert later
  buyer_name: string;
  buyer_contact?: string;
  po_number?: string;
  pickup_quantity: number | ''; // Allow empty string for initialization
  delivery_quantity: number | '';
  brine1_identifier?: string;
  brine2_identifier?: string;
  price_per_block: number | '';
  cash_amount: number | '';
  po_amount: number | '';
  notes?: string;
}

const SalesForm: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialFormData: SaleFormData = {
    si_number: '',
    sale_date: new Date().toISOString().split('T')[0], // Default to today
    sale_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Default to now
    buyer_name: '',
    buyer_contact: '',
    po_number: '',
    pickup_quantity: '',
    delivery_quantity: '',
    brine1_identifier: '',
    brine2_identifier: '',
    price_per_block: '',
    cash_amount: '',
    po_amount: '',
    notes: '',
  };

  const [formData, setFormData] = useState<SaleFormData>(initialFormData);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | '' = value;
    if (type === 'number') {
      // Use Number() which correctly handles empty string (as 0), unlike parseFloat (NaN)
      // However, we want to store empty string in state if the input is cleared
      if (value === '') {
          processedValue = ''; // Store empty string if cleared
      } else {
          const numValue = Number(value);
          // Check if the conversion resulted in NaN (e.g., for invalid input like "abc")
          if (isNaN(numValue)) {
              processedValue = ''; // Keep it as empty string in state if invalid
          } else if (name !== 'notes' && numValue < 0) {
             processedValue = 0; // Prevent negative numbers, store 0
          } else {
             processedValue = numValue; // Store the valid number
          }
      }
    }
    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const requiredFields: (keyof SaleFormData)[] = [
      'si_number', 'sale_date', 'sale_time', 'buyer_name', 
      'pickup_quantity', 'delivery_quantity', 'price_per_block', 
      'cash_amount', 'po_amount'
    ];
    
    const missingField = requiredFields.find(field => formData[field] === '' || formData[field] === null);

    if (missingField) {
      enqueueSnackbar(`Error: Field "${missingField.replace('_', ' ')}" is required.`, { variant: 'error' });
      setIsSubmitting(false);
      return;
    }
    
    const dataToSend = {
      ...formData,
      pickup_quantity: Number(formData.pickup_quantity || 0),
      delivery_quantity: Number(formData.delivery_quantity || 0),
      price_per_block: Number(formData.price_per_block || 0),
      cash_amount: Number(formData.cash_amount || 0),
      po_amount: Number(formData.po_amount || 0),
      buyer_contact: formData.buyer_contact || null,
      po_number: formData.po_number || null,
      brine1_identifier: formData.brine1_identifier || null,
      brine2_identifier: formData.brine2_identifier || null,
      notes: formData.notes || null,
    };

    console.log('Submitting Data:', dataToSend);

    try {
      await apiService.post(endpoints.sales, dataToSend);
      enqueueSnackbar('Sale recorded successfully!', { variant: 'success' });
      setFormData(initialFormData);
    } catch (error: any) {
      console.error('Failed to submit sale:', error);
      let errorMessage = 'Failed to record sale. Please check console for details.';
      // Try to get more specific error from backend response
      if (error.response && error.response.data) {
          const errors = error.response.data;
          // Format Django Rest Framework validation errors (check if it's an object)
          if (typeof errors === 'object' && errors !== null) {
            const formattedErrors = Object.entries(errors).map(([field, messages]) => {
              // Ensure messages is an array before joining
              const messageString = Array.isArray(messages) ? messages.join(', ') : String(messages);
              return `${field}: ${messageString}`;
            }).join('; ');
            if (formattedErrors) { // Use formatted errors only if parsing was successful
                 errorMessage = formattedErrors;
            }
          } else if (typeof errors === 'string') {
             // Handle plain string error response
             errorMessage = errors;
          }
      }
      enqueueSnackbar(errorMessage, { variant: 'error', persist: true }); // Keep error message until dismissed
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off">
      <Grid container spacing={2}>
        {/* Row 1: SI, Date, Time */}
        <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            label="SI Number"
            name="si_number"
            value={formData.si_number}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            label="Sale Date"
            name="sale_date"
            type="date"
            value={formData.sale_date}
            onChange={handleChange}
            InputLabelProps={{
              shrink: true,
            }}
            disabled={isSubmitting}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            label="Sale Time"
            name="sale_time"
            type="time"
            value={formData.sale_time}
            onChange={handleChange}
            InputLabelProps={{
              shrink: true,
            }}
            disabled={isSubmitting}
          />
        </Grid>

        {/* Row 2: Customer, Contact, PO */}
        <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            label="Customer Name"
            name="buyer_name"
            value={formData.buyer_name}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Customer Contact"
            name="buyer_contact"
            value={formData.buyer_contact}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="PO Number"
            name="po_number"
            value={formData.po_number}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </Grid>
        
        {/* Row 3: Pickup Qty, Deliver Qty, Price */}
         <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            label="Pickup Quantity"
            name="pickup_quantity"
            type="number"
            value={formData.pickup_quantity}
            onChange={handleChange}
            inputProps={{ min: 0, step: 1 }}
            disabled={isSubmitting}
          />
        </Grid>
         <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            label="Delivery Quantity"
            name="delivery_quantity"
            type="number"
            value={formData.delivery_quantity}
            onChange={handleChange}
            inputProps={{ min: 0, step: 1 }}
            disabled={isSubmitting}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            required
            fullWidth
            label="Price Per Block"
            name="price_per_block"
            type="number"
            value={formData.price_per_block}
            onChange={handleChange}
            inputProps={{ min: 0, step: 0.01 }}
            disabled={isSubmitting}
          />
        </Grid>
        
        {/* Row 4: Brine 1, Brine 2 */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Brine 1 Identifier"
            name="brine1_identifier"
            value={formData.brine1_identifier}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Brine 2 Identifier"
            name="brine2_identifier"
            value={formData.brine2_identifier}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </Grid>

        {/* Row 5: Cash Amount, PO Amount */}
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="Cash Amount Paid"
            name="cash_amount"
            type="number"
            value={formData.cash_amount}
            onChange={handleChange}
            inputProps={{ min: 0, step: 0.01 }}
            disabled={isSubmitting}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="PO Amount Paid"
            name="po_amount"
            type="number"
            value={formData.po_amount}
            onChange={handleChange}
            inputProps={{ min: 0, step: 0.01 }}
            disabled={isSubmitting}
          />
        </Grid>
        
        {/* Row 6: Remarks */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Remarks"
            name="notes"
            multiline
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </Grid>

        {/* Submit Button with Loading State */}
        <Grid item xs={12}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
             <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                disabled={isSubmitting}
             >
               Submit Sale
             </Button>
             {isSubmitting && (
               <CircularProgress
                 size={24}
                 sx={{
                   color: 'primary.main',
                   position: 'absolute',
                   top: '50%',
                   left: '50%',
                   marginTop: '-12px',
                   marginLeft: '-12px',
                 }}
               />
             )}
           </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SalesForm; 