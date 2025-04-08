import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Autocomplete,
  AutocompleteChangeReason,
  AutocompleteChangeDetails
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { apiService, endpoints } from '../../services/api';
import { BuyerLight } from '../../types/buyers';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';

// Define props interface to include the callback
interface SalesFormProps {
  onSaleAdded: () => void; // Callback function prop
  isIceplantMode: boolean; // New prop to control default
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
  is_iceplant: boolean;
  items: {
    id?: string; // for existing items during update
    inventory_item: string; // inventory item ID
    quantity: number | '';
    unit_price: number | '';
  }[];
}

const SalesForm: React.FC<SalesFormProps> = (props) => {
  const { onSaleAdded, isIceplantMode } = props;
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // State for buyers list
  const [buyers, setBuyers] = useState<BuyerLight[]>([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerLight | null>(null);
  
  const initialFormData: SaleFormData = {
    items: [],
    si_number: '',
    sale_date: new Date().toISOString().split('T')[0], // Keep as string initially
    sale_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
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
    is_iceplant: props.isIceplantMode,
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
  }, []);

  // Update formData.is_iceplant when prop changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      is_iceplant: props.isIceplantMode,
    }));
  }, [props.isIceplantMode]);

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

  // Add specific handler for DatePicker
  const handleDateChange = (newValue: Date | null) => {
    let formattedValue = '';
    if (newValue) {
      try {
        formattedValue = format(newValue, 'yyyy-MM-dd');
        // Clear date error if present
        if (errors.sale_date) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.sale_date;
                return newErrors;
            });
        }
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }
    setFormData({
      ...formData,
      sale_date: formattedValue,
    });
  };

  // Handle buyer selection from autocomplete
  const handleBuyerChange = (
    _event: React.SyntheticEvent,
    newValue: string | BuyerLight | null,
    reason: AutocompleteChangeReason,
    _details?: AutocompleteChangeDetails<BuyerLight>
  ) => {
    console.log(`[SalesForm] Buyer changed. Reason: ${reason}, Value:`, newValue);
    
    // Clear buyer_name error if it exists
    if (errors.buyer_name) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.buyer_name;
        return newErrors;
      });
    }
    
    if (newValue === null) {
      // Input was cleared
      setSelectedBuyer(null);
      setFormData(prev => ({ 
        ...prev, 
        buyer_name: '', 
        buyer_id: undefined 
      }));
    } else if (typeof newValue === 'string') {
      // User typed a new name (freeSolo) or selected the typed string
      setSelectedBuyer(null); // Cannot select an object if it's a string
      setFormData(prev => ({ 
        ...prev, 
        buyer_name: newValue, // Use the string value as the name
        buyer_id: undefined // No ID associated with the typed string yet
      }));
    } else {
      // If it's not null and not string, it MUST be BuyerLight
      setSelectedBuyer(newValue); 
      setFormData(prev => ({ 
        ...prev, 
        // @ts-ignore - Linter struggles with type guard here
        buyer_name: newValue.name, 
        buyer_id: newValue.id,     
        buyer_contact: prev.buyer_contact || newValue.phone || newValue.email || '' 
      }));
    }
  };

  // Handle buyer input change (when typing in autocomplete)
  const handleBuyerInputChange = (_event: React.SyntheticEvent, newInputValue: string) => {
    setFormData(prev => ({
      ...prev,
      buyer_name: newInputValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic form validation
    const currentErrors: Record<string, string> = {};
    if (!formData.si_number) currentErrors.si_number = "SI Number is required";
    if (!formData.buyer_name) currentErrors.buyer_name = "Buyer Name is required";
    if (!formData.price_per_block) currentErrors.price_per_block = "Price per Block is required";
    if ((formData.pickup_quantity || 0) + (formData.delivery_quantity || 0) <= 0) {
      currentErrors.quantity = "At least Pickup or Delivery Quantity must be greater than 0";
    }
    if (!formData.sale_date) currentErrors.sale_date = "Sale Date is required";

    // ---> Add Overpayment Validation <--- 
    const totalQuantity = (Number(formData.pickup_quantity) || 0) + (Number(formData.delivery_quantity) || 0);
    const pricePerBlock = Number(formData.price_per_block) || 0;
    const totalCost = totalQuantity * pricePerBlock;
    
    const cashAmount = Number(formData.cash_amount) || 0;
    const poAmount = Number(formData.po_amount) || 0;
    const totalPayment = cashAmount + poAmount;

    if (totalPayment > totalCost && totalCost > 0) { // Check only if totalCost is calculated and positive
      currentErrors.payment = `Total payment (${formatCurrency(totalPayment)}) cannot exceed total cost (${formatCurrency(totalCost)}).`;
      enqueueSnackbar("Overpayment detected. Please correct Cash or PO Amount.", { variant: 'error' });
    }
    // ---> End Overpayment Validation <---
    
    // Check if there are any validation errors
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      console.error("Validation Errors:", currentErrors);
      enqueueSnackbar("Please fix the errors in the form.", { variant: 'warning' });
      return; // Stop submission if there are errors
    }

    setIsSubmitting(true);
    setErrors({}); // Clear previous errors

    // Prepare data for API, ensure date is formatted
    const dataToSend = {
      ...formData,
      sale_date: formData.sale_date, // Already formatted by handleDateChange
      pickup_quantity: Number(formData.pickup_quantity) || 0,
      delivery_quantity: Number(formData.delivery_quantity) || 0,
      price_per_block: Number(formData.price_per_block) || 0,
      cash_amount: Number(formData.cash_amount) || 0,
      po_amount: Number(formData.po_amount) || 0,
      buyer_id: selectedBuyer ? selectedBuyer.id : undefined,
    };
    
    console.log("Submitting sale data:", dataToSend);

    try {
      const response = await apiService.post(endpoints.sales, dataToSend);
      enqueueSnackbar(`Sale ${response.si_number} added successfully!`, { variant: 'success' });
      setFormData(initialFormData); // Reset form after successful submission
      setSelectedBuyer(null); // Reset selected buyer
      onSaleAdded(); // Call the callback prop
    } catch (error: any) { // Use 'any' or a more specific error type
      console.error("Error adding sale:", error);
      let errorMessage = "Failed to add sale.";
      
      // Check if error response has detailed messages
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        // Combine multiple error messages if they exist
        const messages = Object.entries(errorData)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        if (messages) {
          errorMessage += ` Details: ${messages}`;
        }
      }
      
      enqueueSnackbar(errorMessage, { variant: 'error' });
      
      // Optionally set form errors based on response
      if (error.response && error.response.data && typeof error.response.data === 'object') {
        setErrors(error.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
            <DatePicker
              label="Sale Date"
              value={formData.sale_date ? new Date(formData.sale_date + 'T00:00:00') : null}
              onChange={handleDateChange}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  InputLabelProps: { shrink: true },
                  disabled: isSubmitting,
                  error: !!errors.sale_date,
                  helperText: errors.sale_date
                }
              }}
              format="yyyy-MM-dd"
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
              onInputChange={handleBuyerInputChange}
              options={buyers}
              getOptionLabel={(option) => {
                // Needed for freeSolo: option might be a string or BuyerLight
                if (typeof option === 'string') {
                  return option;
                }
                // Otherwise, it's a BuyerLight object
                return option.name;
              }}
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
                // Fix redundant key: Remove manual key handling
                return (
                  <li {...props} style={{ padding: '8px 16px' }}>  {/* Use props directly */} 
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
                  fullWidth
                  error={!!errors.buyer_name}
                  helperText={errors.buyer_name || "Start typing to search for buyers by name or ID"}
                  InputProps={{ ...params.InputProps /* Keep existing InputProps */ }}
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

          {props.isIceplantMode && (
            <>
              <Grid item xs={12}>
                <h3>Sale Items</h3>
                {formData.items.map((item, index) => (
                  <Grid container spacing={1} key={index} alignItems="center">
                    <Grid item xs={4}>
                      <TextField
                        label="Inventory Item ID"
                        value={item.inventory_item}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].inventory_item = e.target.value;
                          setFormData({ ...formData, items: newItems });
                        }}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        label="Quantity"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].quantity = e.target.value === '' ? '' : Number(e.target.value);
                          setFormData({ ...formData, items: newItems });
                        }}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        label="Unit Price"
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].unit_price = e.target.value === '' ? '' : Number(e.target.value);
                          setFormData({ ...formData, items: newItems });
                        }}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = formData.items.filter((_, i) => i !== index);
                          setFormData({ ...formData, items: newItems });
                        }}
                      >
                        Remove
                      </button>
                    </Grid>
                  </Grid>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      items: [
                        ...formData.items,
                        { inventory_item: '', quantity: '', unit_price: '' },
                      ],
                    });
                  }}
                >
                  Add Item
                </button>
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
            </>
          )}

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
    </LocalizationProvider>
  );
};

export default SalesForm; 