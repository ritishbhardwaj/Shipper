# Legacy Redis connectivity test — no longer used (JWT blacklist is SQLite).
#
# from redis import Redis
# import redis.asyncio
#
# conn= Redis(host="127.0.0.1",port=6379,db =0)
# print(conn.ping())

print("Redis removed from Shipper. JWT blacklist uses SQLite (token_blacklist table).")
