import os
import psycopg2
from psycopg2 import sql

# Database connection parameters from environment variables
db_config = {
    'dbname': os.environ.get('POSTGRES_DB', 'postgres'),
    'user': os.environ.get('POSTGRES_USER', 'postgres'),
    'password': os.environ.get('POSTGRES_PASSWORD', '1'),
    'host': os.environ.get('POSTGRES_HOST', 'localhost'),
    'port': os.environ.get('POSTGRES_PORT', '5432'),
}

def get_tables_and_columns():
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()

        # Get all tables in the database
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)

        tables = cursor.fetchall()

        print("=== DATABASE TABLES AND COLUMNS ===")
        print(f"Database: {db_config['dbname']}")
        print(f"Host: {db_config['host']}:{db_config['port']}")
        print()

        for table in tables:
            table_name = table[0]
            print(f"Table: {table_name}")

            # Get columns for each table
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = %s AND table_schema = 'public'
                ORDER BY ordinal_position;
            """, (table_name,))

            columns = cursor.fetchall()

            if columns:
                print("  Columns:")
                for col in columns:
                    col_name, data_type, is_nullable, default = col
                    nullable = "NULL" if is_nullable == 'YES' else "NOT NULL"
                    default_str = f" DEFAULT {default}" if default else ""
                    print(f"    - {col_name} ({data_type}) {nullable}{default_str}")
            else:
                print("  (No columns found)")

            print()

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    get_tables_and_columns()