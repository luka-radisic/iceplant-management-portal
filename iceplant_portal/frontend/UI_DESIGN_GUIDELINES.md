# IcePlant Portal UI Design Guidelines

This guide defines the common UI patterns and styling conventions for a consistent look and feel across the portal.

---

## 1. Containers & Layout

- Use **Material-UI `Paper`** components to wrap sections.
- Default padding: `sx={{ p: 2, mb: 2 }}`
- Use **elevation** for subtle or prominent shadows:
  ```tsx
  <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
    ...
  </Paper>

  <Paper elevation={6} sx={{ p: 2, mb: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', borderRadius: 2 }}>
    ...
  </Paper>
  ```

---

## 2. Tables

- Use **MUI Table** with sticky headers:
  ```tsx
  <Table size="small" stickyHeader sx={{
    '& thead th': { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
    '& tbody tr:hover': { backgroundColor: '#fafafa' },
    '& tbody tr:nth-of-type(odd)': { backgroundColor: '#fcfcfc' },
  }}>
  ```

- **Row selection with light green highlight:**

  ```tsx
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  <TableRow
    hover
    onClick={() => setSelectedRowId(row.id)}
    selected={selectedRowId === row.id}
    sx={{
      cursor: 'pointer',
      backgroundColor: selectedRowId === row.id ? '#d0f0c0' : undefined,
      '&:hover': {
        backgroundColor: selectedRowId === row.id ? '#c0e8b0' : '#fafafa',
      },
      transition: 'background-color 0.3s',
    }}
  >
  ```

- **Buttons inside cells:**

  ```tsx
  <Button
    variant="text"
    size="small"
    onClick={(e) => {
      e.stopPropagation();
      // action
    }}
    sx={{ textTransform: 'none', fontWeight: 'bold' }}
  >
    Button Text
  </Button>
  ```

---

## 3. Filters & Controls

- Use **Grid layout** for filters:

  ```tsx
  <Grid container spacing={2} alignItems="center">
    <Grid item xs={12} sm={3}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={setStartDate}
          slotProps={{ textField: { fullWidth: true } }}
        />
      </LocalizationProvider>
    </Grid>
    <Grid item xs={12} sm={3}>
      <FormControl fullWidth size="small">
        <InputLabel>Status</InputLabel>
        <Select value={status} onChange={handleStatusChange}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="processed">Processed</MenuItem>
          <MenuItem value="canceled">Canceled</MenuItem>
        </Select>
      </FormControl>
    </Grid>
    <Grid item xs={12} sm={3}>
      <Autocomplete
        options={buyers}
        getOptionLabel={(option) => option.name}
        onChange={handleBuyerChange}
        renderInput={(params) => <TextField {...params} label="Buyer" fullWidth size="small" />}
      />
    </Grid>
  </Grid>
  ```

---

## 4. Typography

- Use `Typography` variants for hierarchy:
  - Section title: `variant="h6"` or `h5`
  - Subtitles: `subtitle1` or `subtitle2`
  - Body text: `body1` or `body2`
- Use `color="text.secondary"` for muted text.

---

## 5. Buttons

- Use `variant="contained"` for primary actions.
- Use `variant="outlined"` or `variant="text"` for secondary actions.
- Consistent sizing: `size="small"` or `size="medium"`.

---

## 6. Tabs

- Use sticky tabs for navigation within a page:

  ```tsx
  <Box sx={{
    borderBottom: 1,
    borderColor: 'divider',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: 'white'
  }}>
    <Tabs value={value} onChange={handleChange}>
      <Tab label="Tab 1" />
      <Tab label="Tab 2" />
    </Tabs>
  </Box>
  ```

---

## 7. Dialogs & Modals

- Use rounded corners and padding.
- Use `maxWidth` and `fullWidth` props for sizing.
- Inside dialogs, use **Cards** with subtle shadows for grouping content.

---

## 8. Colors

- Primary color: use theme's `primary.main`
- Secondary color: use theme's `secondary.main`
- Light green for selection: `#d0f0c0`
- Hover highlight: `#fafafa` or `#c0e8b0` (for selected rows)

---

## 9. Shadows

- Use MUI's `elevation` prop for consistent shadows.
- For custom shadows, use:

  ```tsx
  sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
  ```

---

## 10. Example: Weekend Work Table

```tsx
<Paper elevation={6} sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)', borderRadius: 2 }}>
  <TableContainer>
    <Table size="small" stickyHeader sx={{
      '& thead th': { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
      '& tbody tr:hover': { backgroundColor: '#fafafa' },
      '& tbody tr:nth-of-type(odd)': { backgroundColor: '#fcfcfc' },
    }}>
      <TableHead>
        <TableRow>
          <TableCell>Employee Name</TableCell>
          <TableCell>Department</TableCell>
          <TableCell>Date</TableCell>
          <TableCell>Punch In</TableCell>
          <TableCell>Punch Out</TableCell>
          <TableCell>Duration</TableCell>
          <TableCell>HR Note</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {records.map((record) => (
          <TableRow
            key={record.id}
            hover
            onClick={() => setSelectedRowId(record.id)}
            selected={selectedRowId === record.id}
            sx={{
              cursor: 'pointer',
              backgroundColor: selectedRowId === record.id ? '#d0f0c0' : undefined,
              '&:hover': {
                backgroundColor: selectedRowId === record.id ? '#c0e8b0' : '#fafafa',
              },
              transition: 'background-color 0.3s',
            }}
          >
            <TableCell>{record.employee_name}</TableCell>
            <TableCell>{record.department}</TableCell>
            <TableCell>{record.date}</TableCell>
            <TableCell>{record.punch_in}</TableCell>
            <TableCell>{record.punch_out}</TableCell>
            <TableCell>{record.duration}</TableCell>
            <TableCell>{record.has_hr_note ? 'Yes' : 'No'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
</Paper>
```

---

## Summary

Follow these guidelines to ensure a consistent, clean, and user-friendly interface across all pages of the IcePlant Portal.