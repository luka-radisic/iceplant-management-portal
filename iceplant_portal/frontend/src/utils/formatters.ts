/**
 * Format a number as currency (PHP)
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format a date to local date string
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
};

/**
 * Format a date to local date and time string
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString();
};

/**
 * Format a number with commas
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat().format(value);
};

/**
 * Format a duration in hours and minutes
 */
export const formatDuration = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours} hr${wholeHours !== 1 ? 's' : ''}`;
  }
  
  return `${wholeHours} hr${wholeHours !== 1 ? 's' : ''} ${minutes} min`;
}; 