from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base

DATABASE_URL = "mysql+pymysql://admin:admin1234@az-a.database-lsh.ae90ddc1b6dc4b0581bb44b31f8921b5.mysql.managed-service.kr-central-2.kakaocloud.com:3306/capston"
engine = create_engine(DATABASE_URL)

Base = declarative_base()
