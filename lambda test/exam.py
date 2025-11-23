import boto3
import json
import random

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("admin-question-bank")
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            # Nếu số nguyên:
            if o % 1 == 0:
                return int(o)
            # Nếu số thực:
            return float(o)
        return super(DecimalEncoder, self).default(o)

def lambda_handler(event, context):

    # 1) Scan toàn table (vì bạn không có GSI)
    resp = table.scan()
    items = resp["Items"]

    if not items:
        return {
            "statusCode": 404,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": "No questions found in the database."}),
        }

    # 2) Gom theo loại
    buckets = {
        "fill_short": [],
        "fill_long": [],
        "reading": [],
        "reorder": [],
    }

    for q in items:
        qtype = q.get("question_type")
        if qtype in buckets:
            buckets[qtype].append(q)

    # Helper: select N groups
    def pick_groups(pool, n):
        if len(pool) < n:
            raise Exception(f"Not enough groups of type. Need {n}, have {len(pool)}")
        return random.sample(pool, n)

    # Helper: pick group with at least min_subq subquestions
    def pick_group_with_min(pool, min_subq):
        candidates = [g for g in pool if len(g.get("subquestions", [])) >= min_subq]
        if not candidates:
            raise Exception(f"No reading group with >= {min_subq} subquestions")
        chosen = random.choice(candidates)
        pool.remove(chosen)
        return chosen

    # PICK GROUPS -----------------------------------------
    try:
        # 2 fill_short
        fill_short_groups = pick_groups(buckets["fill_short"], 2)

        # 1 fill_long
        fill_long_group = pick_groups(buckets["fill_long"], 1)

        # reading: 1 group >=10
        reading_pool = buckets["reading"].copy()
        reading_10 = pick_group_with_min(reading_pool, 10)

        # reading: 1 group >=8 but not the previous one
        reading_8 = pick_group_with_min(reading_pool, 8)

        reading_groups = [reading_10, reading_8]

        # 1 reorder
        reorder_selected = pick_groups(buckets["reorder"], 1)

    except Exception as e:
        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": f"Failed to generate exam, not enough questions: {str(e)}"}),
        }

    # COUNT current subquestions
    def count_subq(g):
        return len(g.get("subquestions", []))

    final_total = (
        sum(count_subq(g) for g in fill_short_groups)
        + sum(count_subq(g) for g in fill_long_group)
        + sum(count_subq(g) for g in reading_groups)
        + sum(count_subq(g) for g in reorder_selected)
    )

    # BUILD RESULT ----------------------------------------
    reading_group_counts = [count_subq(g) for g in reading_groups]

    result = {
        "quiz_id": random.randint(100000, 999999),
        "structure": {
            "fill_short_groups": len(fill_short_groups),
            "fill_long_groups": len(fill_long_group),
            "reading_groups": reading_group_counts,
            "reorder_count": len(reorder_selected),
            "total_questions": final_total
        },
        "groups": {
            "fill_short": fill_short_groups,
            "fill_long": fill_long_group,
            "reading": reading_groups
        },
        "reorder_questions": reorder_selected
    }

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        "body": json.dumps(result, ensure_ascii=False, cls=DecimalEncoder)
    }