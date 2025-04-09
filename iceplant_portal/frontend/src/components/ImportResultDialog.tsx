import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';

interface ImportResult {
  success: boolean;
  records_imported: number;
  error_message?: string | null;
}

interface ImportResultDialogProps {
  open: boolean;
  onClose: () => void;
  importResult: ImportResult | null;
}

const ImportResultDialog: React.FC<ImportResultDialogProps> = ({ open, onClose, importResult }) => {
  if (!importResult) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Result</DialogTitle>
      <DialogContent dividers>
        {importResult.success ? (
          <Typography variant="body1" gutterBottom>
            Successfully imported {importResult.records_imported} records.
          </Typography>
        ) : (
          <>
            <Typography variant="body1" color="error" gutterBottom>
              Import failed.
            </Typography>
            {importResult.error_message && (
              <Typography variant="body2" color="textSecondary">
                {importResult.error_message}
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportResultDialog;