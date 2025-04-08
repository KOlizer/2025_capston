from sqlalchemy import Column, String, Date, DateTime, Boolean, ForeignKey
from datetime import datetime
from database import Base

# 거래량 상위 10개 주식 테이블
class TopStock(Base):
    __tablename__ = "top_stock"
    
    company_name = Column(String(255), primary_key=True)  # 기업명 (PK)
    price = Column(String(20), nullable=False)              # 현재가
    volume = Column(String(50), nullable=False)             # 거래량
    ticker = Column(String(20), nullable=False)             # 티커
    date = Column(Date, nullable=False)                     # 크롤링한 날짜

# 사용자 테이블
class User(Base):
    __tablename__ = "user"
    
    user_name = Column(String(50), primary_key=True)              # 사용자 이름 (PK)
    user_passworkd = Column(String(255), nullable=False)           # 비밀번호
    user_email = Column(String(100), unique=True, nullable=False)  # 이메일
    created_at = Column(DateTime, default=datetime.utcnow)         # 회원가입 시각

# 사용자가 즐겨찾기한 테이블
class Favorite(Base):
    __tablename__ = "favorite"
    
    user_name = Column(String(50), ForeignKey("user.user_name"), primary_key=True)
    company_name = Column(String(255), ForeignKey("top_stock.company_name"), primary_key=True)
    subscriptoin = Column(Boolean, default=False)    # 즐겨찾기 여부 (기본 false)
    notification = Column(Boolean, default=False)     # 알림 설정 여부 (기본 false)
