# Module Access Feature Issue Analysis for HR Payrol Group

## Problem
When module permissions (specifically "attendance" and "expenses") are assigned to the "HR Payrol" group via the frontend, the permissions initially appear to work but are not actually persisted after a server restart.

## Root Cause Analysis
Based on the diagnostics and code review, the root cause has been identified:

1. **File Path Inconsistency**: 
   - The permissions are correctly saved to `iceplant_portal/module_permissions.json`, but not to the root `module_permissions.json` and `iceplant_portal/iceplant_core/module_permissions.json` files.
   - The `HasModulePermission` class loads permissions from the relative path `module_permissions.json` during Django startup.
   - Depending on the working directory when Django starts, it might be loading the wrong file.

2. **Module Import Timing Issue**:
   - The `HasModulePermission` class tries to load permissions at module import time (when Django starts).
   - Even if permissions are updated at runtime, they won't be automatically reloaded when Django restarts.
   - The diagnostics confirm this - we see that the JSON files contain the correct permissions, but they're not loaded into the in-memory `MODULE_GROUP_MAPPING`.

## Evidence

1. Running the permissions check script revealed:
   - `iceplant_portal/module_permissions.json` correctly has HR Payrol in the "attendance" and "expenses" modules.
   - The root `module_permissions.json` and `iceplant_portal/iceplant_core/module_permissions.json` did not have HR Payrol.

2. From the console logs:
   - The frontend correctly sends the updated module permissions.
   - The server responds with the correctly updated MODULE_GROUP_MAPPING.
   - But after restart, the permissions are not reflected.

## Solution

1. **Short-Term Fix**:
   - Update ALL module_permissions.json files to include the correct permissions.
   - We've already done this with the check_permissions_files.py script.

2. **Long-Term Fix**:
   - Modify the `HasModulePermission` class to look for module_permissions.json in multiple standard locations.
   - Make the `save_module_permissions` function save to all standard locations.
   - Add a periodic reload mechanism or an admin button to reload permissions without restarting.

## Implementation Plan

1. **Update HasModulePermission Class**:
   - Modify the class to search for module_permissions.json in multiple standard locations.
   - Add better error handling and logging.

2. **Update Module Permissions Utils**:
   - Modify the save_module_permissions function to save to ALL standard locations.
   - Add a reload_module_permissions function that can be called at runtime.

3. **Add Admin Reload Option**:
   - Add a button in the admin interface to reload module permissions.

4. **Add Automated Tests**:
   - Create tests to verify that permissions are correctly persisted and loaded.

## Code Changes

1. **HasModulePermission Class Update**:

```python
# In group_permissions.py
try:
    import os
    import json
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Look for module_permissions.json in multiple standard locations
    possible_locations = [
        "module_permissions.json",  # Current directory
        os.path.join("iceplant_portal", "module_permissions.json"),
        os.path.join("iceplant_portal", "iceplant_core", "module_permissions.json"),
    ]
    
    # Try each location until we find a valid file
    for permission_file in possible_locations:
        if os.path.exists(permission_file):
            try:
                with open(permission_file, 'r') as f:
                    saved_permissions = json.load(f)
                
                # Update the mapping with saved permissions
                MODULE_GROUP_MAPPING.update(saved_permissions)
                logger.info(f"Loaded module permissions from {permission_file}")
                break  # Stop after finding the first valid file
            except Exception as e:
                logger.error(f"Error loading module permissions from {permission_file}: {e}")
except Exception as e:
    # Don't crash if there's an error loading permissions
    pass
```

2. **Update Module Permissions Utils**:

```python
def save_module_permissions():
    """Save the current module permissions to all standard JSON file locations"""
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    
    # Define standard locations
    standard_locations = [
        "module_permissions.json",  # Current directory
        os.path.join("iceplant_portal", "module_permissions.json"),
        os.path.join("iceplant_portal", "iceplant_core", "module_permissions.json"),
    ]
    
    success = True
    for location in standard_locations:
        try:
            # Use absolute path
            absolute_path = os.path.abspath(location)
            logger.info(f"Saving module permissions to {absolute_path}")
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
            
            # Save to file
            with open(absolute_path, 'w') as f:
                json.dump(module_mapping, f, indent=2)
            
            logger.info(f"Module permissions saved to {absolute_path}")
        except Exception as e:
            logger.error(f"Error saving module permissions to {location}: {e}")
            success = False
    
    return success
```

## Recommendation

1. Update the code as outlined above.
2. Implement a management command to reload permissions without restarting.
3. Add better logging to track permission changes.
4. Consider using a database table instead of JSON files for more reliable persistence.

After implementing these changes, module permissions should be correctly persisted and loaded across server restarts.
