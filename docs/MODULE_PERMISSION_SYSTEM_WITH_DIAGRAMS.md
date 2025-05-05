# Module Permission System Documentation

## Overview

The Module Permission System in the IcePlant Management Portal provides a structured approach to manage access control across different functional modules of the application. It connects high-level module concepts with specific Django permissions, ensuring that users with access to a module have all the necessary permissions to perform actions within that module.

## How Module Permissions Work

The system uses a two-tier approach:

1. **Module-Group Mapping**: Defines which user groups have access to which modules
2. **Module-Permission Mapping**: Maps each module to specific Django permissions

When a group is assigned to a module, it automatically receives all the Django permissions necessary to work with that module's functionality.

## System Architecture

```mermaid
flowchart TB
  subgraph Frontend
    UIG[User Interface - Group Management Page]
    UIAPI[API Client]
  end
  
  subgraph Backend
    API[API Endpoints]
    MGM[Module-Group Mapping]
    MPM[Module-Permission Mapping]
    DP[Django Permissions]
    DB[(Database)]
  end
  
  UIG -->|User actions| UIAPI
  UIAPI -->|API requests| API
  API -->|Update| MGM
  API -->|Read/Write| DB
  MGM -->|Determines| MPM
  MPM -->|Assigns| DP
  DP -->|Stored in| DB
```

## Data Flow

```mermaid
sequenceDiagram
  participant User
  participant UI as Frontend UI
  participant API as Backend API
  participant MGM as Module-Group Mapping
  participant MPM as Module-Permission Mapping
  participant DP as Django Permissions
  
  User->>UI: Toggle module access for a group
  UI->>API: POST /api/users/update-group-modules/
  API->>MGM: Update module-group mapping
  Note over MGM: Add/remove group from module
  API->>MPM: Check module-permission mapping
  MPM->>DP: Assign/remove Django permissions
  API->>UI: Return updated mapping
  UI->>User: Show success message
```

## Module-Group Mapping

The module-group mapping defines which groups have access to which modules. It's stored in `HasModulePermission.MODULE_GROUP_MAPPING` and persisted to a JSON file:

```json
{
  "attendance": ["HR", "Managers", "Admins"],
  "sales": ["Sales", "Accounting", "Managers", "Admins"],
  "inventory": ["Inventory", "Operations", "Managers", "Admins"],
  "expenses": ["Accounting", "Finance", "Managers", "Admins"],
  "maintenance": ["Maintenance", "Operations", "Managers", "Admins"],
  "buyers": ["Sales", "Accounting", "Managers", "Admins"]
}
```

## Module-Permission Mapping

Each module is mapped to specific Django permissions in `MODULE_PERMISSION_MAPPING`:

```mermaid
graph TD
    subgraph Modules
        A[Attendance]
        S[Sales]
        I[Inventory]
        E[Expenses]
        M[Maintenance] 
        B[Buyers]
    end
    
    subgraph "Django Permissions"
        A -->|Maps to| AP["attendance.view_attendance
                          attendance.add_attendance
                          attendance.change_attendance
                          attendance.delete_attendance"]
        S -->|Maps to| SP["sales.view_sale
                          sales.add_sale
                          sales.change_sale
                          sales.delete_sale"]
        I -->|Maps to| IP["inventory.view_inventory
                          inventory.add_inventory
                          inventory.change_inventory
                          inventory.delete_inventory"]
        E -->|Maps to| EP["expenses.view_expense
                          expenses.add_expense
                          expenses.change_expense
                          expenses.delete_expense"]
        M -->|Maps to| MP["maintenance.view_maintenanceitem
                          maintenance.add_maintenanceitem
                          maintenance.change_maintenanceitem
                          maintenance.delete_maintenanceitem"]
        B -->|Maps to| BP["buyers.view_buyer
                          buyers.add_buyer
                          buyers.change_buyer
                          buyers.delete_buyer"]
    end
```

## Group Management and Module Assignment

When managing groups and their module access through the Group Management page:

```mermaid
graph TD
    subgraph "Group Management UI"
        CG[Create Group]
        EG[Edit Group]
        DG[Delete Group]
        MA[Module Assignment]
    end
    
    subgraph "Backend Effects"
        GC[Group Creation in Django]
        GP[Django Permission Assignment]
        MGM[Module-Group Mapping Update]
        PS[Persist to Storage]
    end
    
    CG -->|Creates| GC
    EG -->|Updates| GC
    MA -->|Updates| MGM
    MGM -->|Triggers| GP
    MGM -->|Saves to| PS
    DG -->|Removes| GC
    DG -->|Cleans| MGM
```

## User Access Control Flow

```mermaid
flowchart TD
    User[User Request] --> Auth[Authentication Check]
    Auth -->|Authenticated| Perm[Permission Check]
    Auth -->|Not Authenticated| Deny[Access Denied]
    
    Perm -->|Check User Groups| Groups[User Groups]
    Groups -->|Has Admin Group| Grant[Access Granted]
    Groups -->|Check Module Access| Module[HasModulePermission]
    
    Module -->|User Group in Module Mapping| Grant
    Module -->|User Group not in Module Mapping| Deny
```

## Implementation Details

### Frontend Implementation

The Group Management page allows administrators to:
1. Create new groups
2. Edit existing groups
3. Delete groups
4. Assign modules to groups

```mermaid
classDiagram
    class GroupManagementPage {
        -groups: Group[]
        -moduleMapping: ModuleGroupMapping
        -availableModules: Module[]
        -selectedGroup: Group
        -dialogMode: 'create'|'edit'
        +fetchGroups()
        +fetchModuleMapping()
        +handleSaveGroup()
        +handleDeleteGroup()
        +handleModuleToggle()
    }
    
    class Group {
        +id: number
        +name: string
        +user_count: number
    }
    
    class Module {
        +key: string
        +name: string
        +allowed: boolean
    }
    
    class ModuleGroupMapping {
        +[module: string]: string[]
    }
    
    GroupManagementPage "1" --> "*" Group: manages
    GroupManagementPage "1" --> "1" ModuleGroupMapping: uses
    GroupManagementPage "1" --> "*" Module: configures
```

### Backend Implementation

The backend handles:
1. Storing and retrieving group information
2. Managing the module-group mapping
3. Assigning and revoking Django permissions based on module access

```mermaid
classDiagram
    class GroupViewSet {
        +create()
        +update()
        +perform_destroy()
    }
    
    class HasModulePermission {
        +MODULE_GROUP_MAPPING
        +has_permission()
    }
    
    class ModulePermissionService {
        +assign_module_permissions_to_group()
        +remove_module_permissions_from_group()
        +sync_module_permissions()
    }
    
    GroupViewSet --> HasModulePermission: uses
    GroupViewSet --> ModulePermissionService: uses
```

## Module Access Logic

Modules represent logical groupings of functionality in the IcePlant Management Portal. Each module:

1. **Maps to a specific department or cross-department function**
   - Attendance → HR Department
   - Sales → Sales Department
   - Inventory → Operations/Warehouse Department
   - Expenses → Finance/Accounting Department
   - Maintenance → Operations/Maintenance Department
   - Buyers → Sales/Customer Relations Department

2. **Contains a set of related functionalities**
   - Each module includes capabilities to view, create, edit, and delete relevant records
   - Some modules have additional specialized permissions (e.g., approving attendance records)

3. **Has well-defined permission boundaries**
   - Permissions don't overlap between modules
   - Access to one module doesn't grant access to another module
   - Cross-cutting concerns are managed by assigning multiple modules to a group

## Best Practices for Module Assignment

When assigning modules to groups, consider the following:

1. **Use the Principle of Least Privilege**
   - Only assign modules that are necessary for the group's function
   - Regularly review and audit module assignments

2. **Consider Departmental Structure**
   - Align module assignments with your organizational structure
   - Use group names that reflect departments or job functions

3. **Use Role-Based Assignment**
   - Create groups based on roles, not individuals
   - Assign users to groups, not directly to modules

4. **Document Module-Permission Relationships**
   - Maintain documentation of which permissions are included in each module
   - When adding new functionalities, update the module-permission mapping

## Troubleshooting Common Issues

### Issue: User can see a module but can't perform actions

**Potential causes:**
- Django permissions aren't correctly assigned to the group
- Permissions for new functionalities were added but the module-permission mapping wasn't updated

**Solution:**
- Run `sync_module_permissions()` to synchronize module permissions with Django permissions
- Update MODULE_PERMISSION_MAPPING if new permissions are needed

### Issue: Changes to module assignments don't persist after server restart

**Potential causes:**
- Module permissions aren't being saved to disk
- Permissions file is corrupted or inaccessible

**Solution:**
- Verify that `save_module_permissions()` is being called after updates
- Check file permissions and structure of the JSON file

### Issue: Wrong permissions assigned to a module

**Potential causes:**
- Error in the MODULE_PERMISSION_MAPPING definition
- Database migrations created new permissions that aren't included in the mapping

**Solution:**
- Update MODULE_PERMISSION_MAPPING with the correct permissions
- Run the sync function to apply the updated mapping

## Conclusion

The Module Permission System provides a flexible and maintainable way to manage access control in the IcePlant Management Portal. By connecting high-level modules to specific Django permissions, it simplifies group management while ensuring precise access control.
