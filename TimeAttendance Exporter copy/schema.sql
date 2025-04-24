CREATE TABLE employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT,
                name TEXT, department TEXT,
                UNIQUE(employee_id)
            );
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT,
                date TEXT,
                day TEXT,
                status TEXT,
                time_in TEXT,
                time_out TEXT,
                actual_time TEXT, required_time TEXT, company TEXT, report_period TEXT, source TEXT,
                FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
            );
