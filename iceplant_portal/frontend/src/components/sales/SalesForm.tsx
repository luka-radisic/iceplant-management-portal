import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { apiService, endpoints } from '../../services/api';
import { BuyerLight } from '../../types/buyers';

// Define props interface to include the callback
interface SalesFormProps {
  onSaleAdded: () => void; // Callback function prop
}

// Define an interface for the form data based on the model
interface SaleFormData {
  si_number: string;
  sale_date: string; // Use string for date input, convert later
  sale_time: string; // Use string for time input, convert later
  buyer_id?: string;  // Add buyer_id for linking to Buyer
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

const SalesForm: React.FC<SalesFormProps> = ({ onSaleAdded }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // State for buyers list
  const [buyers, setBuyers] = useState<BuyerLight[]>([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerLight | null>(null);
  
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

  // Load active buyers on component mount
  useEffect(() => {
    const fetchBuyers = async () => {
      setLoadingBuyers(true);
      try {
        const response = await apiService.getActiveBuyers();
        setBuyers(response);
      } catch (error) {
        console.error("Failed to load buyers:", error);
        enqueueSnackbar("Failed to load buyers list", { variant: 'error' });
      } finally {
        setLoadingBuyers(false);
      }
    };
    
    fetchBuyers();
  }, [enqueueSnackbar]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | '' = value;
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
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

  // Handle buyer selection from autocomplete
  const handleBuyerChange = (event: React.SyntheticEvent, newValue: BuyerLight | null) => {
    setSelectedBuyer(newValue);
    
    // Clear buyer_name error if it exists
    if (errors.buyer_name) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.buyer_name;
        return newErrors;
      });
    }
    
    if (newValue) {
      // Update form with selected buyer's info
      setFormData(prev => ({
        ...prev,
        buyer_id: newValue.id,
        buyer_name: newValue.name,
        buyer_contact: newValue.phone || '',
      }));
    } else {
      // Clear buyer-related fields
      setFormData(prev => ({
        ...prev,
        buyer_id: undefined,
      }));
    }
  };

  // Handle buyer input change (when typing in autocomplete)
  const handleBuyerInputChange = (event: React.SyntheticEvent, newInputValue: string) => {
    setFormData(prev => ({
      ...prev,
      buyer_name: newInputValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Clear previous errors
    setErrors({});

    // Validate form
    let hasErrors = false;
    const newErrors: Record<string, string> = {};

    const requiredFields: (keyof SaleFormData)[] = [
      'si_number', 'sale_date', 'sale_time', 'buyer_name', 
      'pickup_quantity', 'delivery_quantity', 'price_per_block', 
      'cash_amount', 'po_amount'
    ];
    
    for (const field of requiredFields) {
      if (formData[field] === '' || formData[field] === null) {
        newErrors[field] = `${field.replace(/_/g, ' ')} is required`;
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setErrors(newErrors);
      enqueueSnackbar(`Please fix the errors in the form.`, { variant: 'error' });
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
      // If no buyer_id is present but we have a buyer_name, try to find or create a buyer
      if (!formData.buyer_id && formData.buyer_name) {
        try {
          // Use the enhanced search method that also checks for UUID format
          const buyerResponse = await apiService.searchOrCreateBuyerWithId(formData.buyer_name);
          if (buyerResponse && buyerResponse.id) {
            dataToSend.buyer_id = buyerResponse.id;
            
            // Update the buyers list with the new buyer
            if (!buyers.some(b => b.id === buyerResponse.id)) {
              setBuyers(prev => [...prev, buyerResponse]);
            }
          }
        } catch (err) {
          console.error("Error finding/creating buyer:", err);
          // Continue with the sale even if buyer creation fails
        }
      }

      await apiService.post(endpoints.sales, dataToSend);
      enqueueSnackbar('Sale recorded successfully!', { variant: 'success' });
      setFormData(initialFormData);
      setSelectedBuyer(null);
      onSaleAdded();
    } catch (error: any) {
      console.error('Failed to submit sale:', error);
      let errorMessage = 'Failed to record sale. Please check console for details.';
      
      // Clear previous field errors
      setErrors({});
      
      // Try to get more specific error from backend response
      if (error.response && error.response.data) {
          const errors = error.response.data;
          // Format Django Rest Framework validation errors (check if it's an object)
          if (typeof errors === 'object' && errors !== null) {
            // Set field-specific errors
            const fieldErrors: Record<string, string> = {};
            
            Object.entries(errors).forEach(([field, messages]) => {
              // Ensure messages is an array before joining
              const messageString = Array.isArray(messages) ? messages.join(', ') : String(messages);
              fieldErrors[field] = messageString;
            });
            
            setErrors(fieldErrors);
            
            // Format a general error message
            const formattedErrors = Object.entries(errors).map(([field, messages]) => {
              const messageString = Array.isArray(messages) ? messages.join(', ') : String(messages);
              return `${field}: ${messageString}`;
            }).join('; ');
            
            if (formattedErrors) {
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
            error={!!errors.si_number}
            helperText={errors.si_number}
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
            error={!!errors.sale_date}
            helperText={errors.sale_date}
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
            error={!!errors.sale_time}
            helperText={errors.sale_time}
          />
        </Grid>

        {/* Row 2: Buyer, Contact, PO */}
        <Grid item xs={12} md={4}>
          <Autocomplete
            id="buyer-autocomplete"
            value={selectedBuyer}
            onChange={handleBuyerChange}
            options={buyers}
            getOptionLabel={(option) => option.name}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Buyer Name"
                required
                value={formData.buyer_name}
                onChange={(e) => {
                  setFormData({...formData, buyer_name: e.target.value});
                  setSelectedBuyer(null);
                }}
                fullWidth
                error={!!errors.buyer_name}
                helperText={errors.buyer_name || "Enter buyer name or paste buyer ID for exact match"}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Buyer Contact"
            value={formData.buyer_contact || ''}
            onChange={(e) => setFormData({...formData, buyer_contact: e.target.value})}
            placeholder="Phone or email"
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
            error={!!errors.pickup_quantity}
            helperText={errors.pickup_quantity}
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
            error={!!errors.delivery_quantity}
            helperText={errors.delivery_quantity}
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
            error={!!errors.price_per_block}
            helperText={errors.price_per_block}
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
            error={!!errors.cash_amount}
            helperText={errors.cash_amount}
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
            error={!!errors.po_amount}
            helperText={errors.po_amount}
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