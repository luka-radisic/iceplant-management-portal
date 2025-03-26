import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { LogEntry, LogLevel, useLogger } from '../../utils/logger';

interface LogViewerProps {
  maxHeight?: string | number;
  showFilters?: boolean;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  maxHeight = 400,
  showFilters = true,
}) => {
  const logger = useLogger();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  useEffect(() => {
    // Subscribe to log updates
    const unsubscribe = logger.addListener((newLogs) => {
      setLogs(newLogs);
    });

    // Initial logs
    setLogs(logger.getRecentLogs());

    return unsubscribe;
  }, [logger]);

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    const matchesSearch = searchTerm === '' ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.componentName?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  const getLogColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.ERROR:
        return '#f44336';
      case LogLevel.WARN:
        return '#ff9800';
      case LogLevel.INFO:
        return '#2196f3';
      case LogLevel.DEBUG:
        return '#4caf50';
      default:
        return 'inherit';
    }
  };

  const handleClearLogs = () => {
    logger.clearLogs();
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: 2,
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Typography variant="h6" component="div">
            System Logs
          </Typography>
          <Box>
            {showFilters && (
              <Tooltip title="Toggle Filters">
                <IconButton
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                  color={showFiltersPanel ? 'primary' : 'default'}
                >
                  <FilterListIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Clear Logs">
              <IconButton onClick={handleClearLogs}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>
      </Box>

      {showFilters && showFiltersPanel && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Level</InputLabel>
              <Select
                value={selectedLevel}
                label="Level"
                onChange={(e) => setSelectedLevel(e.target.value as LogLevel | 'ALL')}
              >
                <MenuItem value="ALL">All Levels</MenuItem>
                {Object.values(LogLevel).map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flexGrow: 1 }}
            />
          </Stack>
        </Box>
      )}

      <Box
        sx={{
          maxHeight,
          overflow: 'auto',
          bgcolor: '#f5f5f5',
          p: 2,
        }}
      >
        {filteredLogs.length === 0 ? (
          <Typography color="text.secondary" align="center">
            No logs to display
          </Typography>
        ) : (
          filteredLogs.map((log, index) => (
            <Box
              key={index}
              sx={{
                p: 1,
                mb: 1,
                bgcolor: 'background.paper',
                borderRadius: 1,
                borderLeft: 4,
                borderLeftColor: getLogColor(log.level),
              }}
            >
              <Typography variant="caption" component="div" color="text.secondary">
                {new Date(log.timestamp).toLocaleString()} - {log.componentName}
              </Typography>
              <Typography variant="body2" sx={{ color: getLogColor(log.level) }}>
                [{log.level}] {log.message}
              </Typography>
              {log.details && (
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    mt: 1,
                    p: 1,
                    bgcolor: '#f8f9fa',
                    borderRadius: 1,
                    overflow: 'auto',
                  }}
                >
                  {typeof log.details === 'string'
                    ? log.details
                    : JSON.stringify(log.details, null, 2)}
                </Typography>
              )}
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
}; 