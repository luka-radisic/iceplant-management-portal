import { Container, Typography, Paper, Box } from '@mui/material';
import MetaHead from '../components/MetaHead';

export default function Sales() {
  return (
    <>
      <MetaHead 
        title="Sales - Ice Plant Management Portal"
        description="Track and analyze sales performance and customer orders."
        keywords={['ice plant', 'management', 'sales', 'orders', 'customers', 'revenue']}
      />
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Sales Management
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <Typography variant="h6" color="textSecondary">
              Sales Page (Coming Soon)
            </Typography>
          </Box>
        </Paper>
      </Container>
    </>
  );
} 