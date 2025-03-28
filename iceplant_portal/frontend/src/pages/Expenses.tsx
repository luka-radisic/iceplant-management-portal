import { Container, Typography, Paper, Box } from '@mui/material';

export default function Expenses() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Expenses Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <Typography variant="h6" color="textSecondary">
            Expenses Page (Coming Soon)
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
} 