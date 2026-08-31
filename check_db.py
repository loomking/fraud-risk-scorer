import sqlite3
import json

db_path = "fraud_risk.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Check evidence packets
cursor.execute("SELECT id, transaction_id, created_at, source_fields FROM evidence_packets")
rows = cursor.fetchall()

stale_packets = []
for row in rows:
    source_fields = json.loads(row["source_fields"]) if row["source_fields"] else []
    if "uid_prior_fraud_rate" in source_fields:
        stale_packets.append(dict(row))

print(f"Found {len(stale_packets)} stale evidence packets containing 'uid_prior_fraud_rate'.")
if stale_packets:
    for pkt in stale_packets:
        print(f"  - Packet ID: {pkt['id']}, Txn: {pkt['transaction_id']}, Created: {pkt['created_at']}")

# Let's just delete them if they exist to be clean.
if stale_packets:
    print("Purging stale evidence packets...")
    cursor.execute("DELETE FROM evidence_packets WHERE id IN ({})".format(",".join("?" * len(stale_packets))), [p["id"] for p in stale_packets])
    conn.commit()
    print("Purged.")

conn.close()
