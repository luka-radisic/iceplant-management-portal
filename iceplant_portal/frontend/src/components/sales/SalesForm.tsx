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
        console.log("Loaded buyers for autocomplete:", response);
        
        // Sort buyers alphabetically by name for better usability
        const sortedBuyers = [...response].sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
        
        setBuyers(sortedBuyers);
      } catch (error) {
        console.error("Failed to load buyers:", error);
        enqueueSnackbar("Failed to load buyers list", { variant: 'error' });
      } finally {
        setLoadingBuyers(false);
      }
    };
    
    fetchBuyers();
  }, [enqueueSnackbar]);

  // Regular change handler for text fields
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle change for numeric inputs with currency formatting
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Allow any digits and one decimal point
    let cleanValue = value;
    
    // For empty input, set as empty string
    if (cleanValue === '') {
      setFormData(prev => ({
        ...prev,
        [name]: '',
      }));
      return;
    }
    
    // For non-empty input, ensure it's a valid number format
    // Remove any non-numeric characters except decimal
    cleanValue = cleanValue.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      cleanValue = `${parts[0]}.${parts.slice(1).join('')}`;
    }
    
    // Convert to number if valid
    const numericValue = isNaN(Number(cleanValue)) ? 0 : Number(cleanValue);
    
    // Update the form data
    setFormData(prev => ({
      ...prev,
      [name]: cleanValue === '' ? '' : numericValue,
    }));
  };

  // Function to format currency for display
  const formatCurrency = (value: number | string): string => {
    if (value === '' || value === null || value === undefined) return '';
    
    // Convert to number
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '';
    
    // Format the number with thousand separators and 2 decimal places
    const formattedNumber = numValue.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Explicitly prepend the Philippine Peso symbol
    return `₱${formattedNumber}`;
  };

  // Function to format number without currency symbol
  const formatNumber = (value: number | string): string => {
    if (value === '' || value === null || value === undefined) return '';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '';
    
    return numValue.toLocaleString('en-PH');
  };

  // Handle numeric input for quantities
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Allow any digits
    let cleanValue = value;
    
    // For empty input, set as empty string
    if (cleanValue === '') {
      setFormData(prev => ({
        ...prev,
        [name]: '',
      }));
      return;
    }
    
    // For non-empty input, ensure it's only digits
    cleanValue = cleanValue.replace(/\D/g, '');
    
    // Convert to number if valid
    const numericValue = isNaN(Number(cleanValue)) ? 0 : Number(cleanValue);
    
    // Update the form data
    setFormData(prev => ({
      ...prev,
      [name]: cleanValue === '' ? '' : numericValue,
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
      setFormData(prev => {
        // Prepare contact info - use phone as default, fallback to email
        const contactInfo = newValue.phone || newValue.email || prev.buyer_contact || '';
        
        // If this is a repeat customer, try to use their previous PO number if we don't have one yet
        const poNumber = prev.po_number || '';
        
        return {
          ...prev,
          buyer_id: newValue.id,
          buyer_name: newValue.name,
          buyer_contact: contactInfo,
          // No need to override PO number if it's already set
          po_number: poNumber,
        };
      });
      
      // Show a notification that buyer info was loaded
      enqueueSnackbar(`Buyer "${newValue.name}" selected`, { 
        variant: 'success',
        autoHideDuration: 2000 
      });
    } else {
      // Clear buyer-related fields if selection is cleared
      setFormData(prev => ({
        ...prev,
        buyer_id: undefined,
        // Don't clear buyer name if user is typing
        // buyer_name: '',
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
      // Ensure all numeric fields are sent as numbers
      pickup_quantity: Number(formData.pickup_quantity || 0),
      delivery_quantity: Number(formData.delivery_quantity || 0),
      price_per_block: Number(formData.price_per_block || 0),
      cash_amount: Number(formData.cash_amount || 0),
      po_amount: Number(formData.po_amount || 0),
      // Keep optional fields as null if empty
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
            filterOptions={(options, state) => {
              const inputValue = state.inputValue.toLowerCase().trim();
              // Don't show any options if the user hasn't typed anything
              if (!inputValue) return [];
              
              // Split input to handle both first and last name searches
              const terms = inputValue.split(/\s+/);
              
              return options.filter(option => {
                const fullName = option.name.toLowerCase();
                const nameParts = fullName.split(/\s+/); // Split into words (first/last name)
                
                // Handle multi-word searches (e.g., "John S" should match "John Smith")
                if (terms.length > 1 && terms.length <= nameParts.length) {
                  // Check if consecutive terms match beginnings of consecutive name parts
                  let matchesAllTerms = true;
                  
                  for (let i = 0; i < terms.length; i++) {
                    // For each term, check if any name part starts with it
                    const term = terms[i];
                    const matchesAnyPart = nameParts.some((part, index) => {
                      // If it's not the first term, we should prefer matching later name parts
                      // For first term, check all parts. For later terms, prioritize matching later parts
                      if (i === 0 || index >= i) {
                        return part.startsWith(term);
                      }
                      return false;
                    });
                    
                    if (!matchesAnyPart) {
                      matchesAllTerms = false;
                      break;
                    }
                  }
                  
                  return matchesAllTerms;
                }
                
                // Single word search: match if any name part starts with the input
                return nameParts.some(part => part.startsWith(inputValue));
              });
            }}
            renderOption={(props, option) => {
              // Extract key from props
              const { key, ...otherProps } = props;
              return (
                <li key={key} {...otherProps} style={{ padding: '8px 16px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{option.name}</div>
                    {option.company_name && (
                      <div style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)' }}>{option.company_name}</div>
                    )}
                    {option.phone && (
                      <div style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)' }}>{option.phone}</div>
                    )}
                  </div>
                </li>
              );
            }}
            freeSolo
            autoHighlight
            clearOnEscape
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={loadingBuyers}
            noOptionsText="No matching buyers found"
            loadingText="Loading buyers..."
            renderInput={(params) => (
              <TextField
                {...params}
                label="Buyer Name"
                required
                onChange={(e) => {
                  setFormData({...formData, buyer_name: e.target.value});
                  if (e.target.value === '') {
                    setSelectedBuyer(null);
                  }
                }}
                fullWidth
                error={!!errors.buyer_name}
                helperText={errors.buyer_name || "Start typing to search for buyers by name or ID"}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingBuyers ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Buyer Contact"
            name="buyer_contact"
            value={formData.buyer_contact || ''}
            onChange={(e) => setFormData({...formData, buyer_contact: e.target.value})}
            placeholder="Phone or email"
            InputProps={{
              startAdornment: selectedBuyer && (
                <Box component="span" sx={{ 
                  color: 'success.main', 
                  fontSize: '0.8rem',
                  position: 'absolute',
                  top: '-20px',
                  left: '0'
                }}>
                  {selectedBuyer.company_name ? `${selectedBuyer.company_name}` : ''}
                </Box>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="PO Number"
            name="po_number"
            value={formData.po_number}
            onChange={handleChange}
            inputProps={{ 
              pattern: '[A-Za-z0-9-]*',
              title: 'Alphanumeric characters only' 
            }}
            placeholder="e.g., PO-12345"
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
            type="text"
            inputMode="numeric"
            value={formData.pickup_quantity}
            onChange={handleQuantityChange}
            InputProps={{
              endAdornment: <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>blocks</Box>,
            }}
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
            type="text"
            inputMode="numeric"
            value={formData.delivery_quantity}
            onChange={handleQuantityChange}
            InputProps={{
              endAdornment: <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>blocks</Box>,
            }}
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
            type="text"
            inputMode="decimal"
            value={formData.price_per_block}
            onChange={handleCurrencyChange}
            disabled={isSubmitting}
            error={!!errors.price_per_block}
            helperText={errors.price_per_block}
            InputProps={{
              endAdornment: formData.price_per_block !== '' ? 
                <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                  {formatCurrency(formData.price_per_block)}
                </Box> : null
            }}
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
            placeholder="Enter brine batch number"
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
            placeholder="Enter brine batch number"
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
            type="text"
            inputMode="decimal"
            value={formData.cash_amount}
            onChange={handleCurrencyChange}
            disabled={isSubmitting}
            error={!!errors.cash_amount}
            helperText={errors.cash_amount}
            InputProps={{
              endAdornment: formData.cash_amount !== '' ? 
                <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                  {formatCurrency(formData.cash_amount)}
                </Box> : null
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="PO Amount Paid"
            name="po_amount"
            type="text"
            inputMode="decimal"
            value={formData.po_amount}
            onChange={handleCurrencyChange}
            disabled={isSubmitting}
            error={!!errors.po_amount}
            helperText={errors.po_amount}
            InputProps={{
              endAdornment: formData.po_amount !== '' ? 
                <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                  {formatCurrency(formData.po_amount)}
                </Box> : null
            }}
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