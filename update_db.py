import sqlite3

def upgrade_db():
    conn = sqlite3.connect('linkpet.db')
    cursor = conn.cursor()
    
    # Check if columns exist
    cursor.execute("PRAGMA table_info(pets)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if 'visited_landmarks' not in columns:
        print("Adding visited_landmarks column...")
        cursor.execute("ALTER TABLE pets ADD COLUMN visited_landmarks TEXT DEFAULT '[]'")
        
    if 'current_destination' not in columns:
        print("Adding current_destination column...")
        cursor.execute("ALTER TABLE pets ADD COLUMN current_destination TEXT")

    # New Hatching Columns
    if 'hatch_progress_seconds' not in columns:
        print("Adding hatch_progress_seconds column...")
        cursor.execute("ALTER TABLE pets ADD COLUMN hatch_progress_seconds INTEGER DEFAULT 0")

    if 'heat_buffer_seconds' not in columns:
        print("Adding heat_buffer_seconds column...")
        cursor.execute("ALTER TABLE pets ADD COLUMN heat_buffer_seconds INTEGER DEFAULT 0")

    if 'last_hatch_update' not in columns:
        print("Adding last_hatch_update column...")
        cursor.execute("ALTER TABLE pets ADD COLUMN last_hatch_update INTEGER DEFAULT 0")

    if 'frozen_since' not in columns:
        print("Adding frozen_since column...")
        cursor.execute("ALTER TABLE pets ADD COLUMN frozen_since INTEGER")

    if 'hatch_answers' not in columns:
        print("Adding hatch_answers column...")
        cursor.execute("ALTER TABLE pets ADD COLUMN hatch_answers TEXT DEFAULT '[]'")

    # User table updates
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [info[1] for info in cursor.fetchall()]

    if 'nickname' not in user_columns:
        print("Adding nickname column to users...")
        cursor.execute("ALTER TABLE users ADD COLUMN nickname TEXT")
        
    conn.commit()
    conn.close()
    print("Database upgrade complete.")

if __name__ == "__main__":
    upgrade_db()
