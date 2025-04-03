import { useState, useCallback } from 'react';
import { Sale } from '../types/sales';

interface FilterParams {
  status: string;
  buyerName: string;
  dateFrom: string;
  dateTo: string;
  sortField: keyof Sale;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

interface UseSalesFilterReturn {
  filters: FilterParams;
  setStatusFilter: (status: string) => void;
  setBuyerFilter: (buyerName: string) => void;
  setDateFromFilter: (date: string) => void;
  setDateToFilter: (date: string) => void;
  setSort: (field: keyof Sale) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetFilters: () => void;
  buildQueryString: () => string;
}

/**
 * Custom hook for managing sales filters and pagination
 * 
 * @param initialFilters Optional initial filter values
 * @returns Filter state and functions to manage filters
 */
export const useSalesFilter = (initialFilters?: Partial<FilterParams>): UseSalesFilterReturn => {
  // Set default values for filters
  const [filters, setFilters] = useState<FilterParams>({
    status: initialFilters?.status || '',
    buyerName: initialFilters?.buyerName || '',
    dateFrom: initialFilters?.dateFrom || '',
    dateTo: initialFilters?.dateTo || '',
    sortField: initialFilters?.sortField || 'sale_date',
    sortDirection: initialFilters?.sortDirection || 'desc',
    page: initialFilters?.page || 1,
    pageSize: initialFilters?.pageSize || 10
  });
  
  // Handler for setting status filter
  const setStatusFilter = useCallback((status: string) => {
    setFilters(prev => ({
      ...prev,
      status,
      page: 1 // Reset to page 1 when filter changes
    }));
  }, []);
  
  // Handler for setting buyer name filter
  const setBuyerFilter = useCallback((buyerName: string) => {
    setFilters(prev => ({
      ...prev,
      buyerName,
      page: 1 // Reset to page 1 when filter changes
    }));
  }, []);
  
  // Handler for setting date from filter
  const setDateFromFilter = useCallback((dateFrom: string) => {
    setFilters(prev => ({
      ...prev,
      dateFrom,
      page: 1 // Reset to page 1 when filter changes
    }));
  }, []);
  
  // Handler for setting date to filter
  const setDateToFilter = useCallback((dateTo: string) => {
    setFilters(prev => ({
      ...prev,
      dateTo,
      page: 1 // Reset to page 1 when filter changes
    }));
  }, []);
  
  // Handler for setting sort field and direction
  const setSort = useCallback((field: keyof Sale) => {
    setFilters(prev => {
      const newDirection = prev.sortField === field && prev.sortDirection === 'asc' ? 'desc' : 'asc';
      return {
        ...prev,
        sortField: field,
        sortDirection: newDirection
      };
    });
  }, []);
  
  // Handler for setting page
  const setPage = useCallback((page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  }, []);
  
  // Handler for setting page size
  const setPageSize = useCallback((pageSize: number) => {
    setFilters(prev => ({
      ...prev,
      pageSize,
      page: 1 // Reset to page 1 when page size changes
    }));
  }, []);
  
  // Reset all filters to default values
  const resetFilters = useCallback(() => {
    setFilters({
      status: '',
      buyerName: '',
      dateFrom: '',
      dateTo: '',
      sortField: 'sale_date',
      sortDirection: 'desc',
      page: 1,
      pageSize: 10
    });
  }, []);
  
  // Build query string from filters
  const buildQueryString = useCallback(() => {
    // Start with pagination parameters
    const query = `?page=${filters.page}&page_size=${filters.pageSize}`;
    
    // Add filter parameters
    const params = new URLSearchParams();
    
    if (filters.status) {
      params.append('status', filters.status);
    }
    
    if (filters.buyerName) {
      // Trim whitespace from buyer name
      const trimmedBuyerName = filters.buyerName.trim();
      if (trimmedBuyerName) {
        params.append('buyer_name__icontains', trimmedBuyerName);
      }
    }
    
    if (filters.dateFrom) {
      params.append('sale_date__gte', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      params.append('sale_date__lte', filters.dateTo);
    }
    
    // Add sorting parameters
    if (filters.sortField) {
      const sortParam = filters.sortDirection === 'asc' 
        ? filters.sortField 
        : `-${filters.sortField}`;
      params.append('ordering', sortParam);
    }
    
    // Add timestamp to prevent caching
    params.append('_t', Date.now().toString());
    
    // Combine query and parameters
    return params.toString() ? `${query}&${params.toString()}` : query;
  }, [filters]);
  
  return {
    filters,
    setStatusFilter,
    setBuyerFilter,
    setDateFromFilter,
    setDateToFilter,
    setSort,
    setPage,
    setPageSize,
    resetFilters,
    buildQueryString
  };
};

export default useSalesFilter; 