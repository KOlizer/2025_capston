from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# 거래량 상위 10개 주식 테이블
class TopStock(Base):
    __tablename__ = "top_stock"
    
    company_name = Column(String(255), primary_key=True)   # 기업명 (PK)
    price = Column(String(20), nullable=False)             # 현재가
    volume = Column(String(50), nullable=False)            # 거래량
    ticker = Column(String(20), nullable=False)            # 티커
    date = Column(Date, nullable=False)                    # 크롤링한 날짜
    
    # Favorite 테이블과의 관계 (company_name을 기준으로 참조)
    favorites = relationship("Favorite", back_populates="top_stock", cascade="all, delete-orphan")


# 사용자 테이블
class User(Base):
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, autoincrement=True)  # 사용자 고유 ID
    user_name = Column(String(50), nullable=False)              # 사용자명 (중복 허용 가능)
    user_passworkd = Column(String(255), nullable=False)          # 비밀번호
    user_email = Column(String(100), unique=True, nullable=False) # 이메일
    created_at = Column(DateTime, default=datetime.utcnow)        # 회원가입 시각
    
    # Favorite 테이블과의 관계 (User.id를 참조)
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")


# 사용자가 즐겨찾기한 테이블
class Favorite(Base):
    __tablename__ = "favorite"
    
    user_id = Column(Integer, ForeignKey("user.id"), primary_key=True)  # User.id를 참조, 컬럼명: user_id
    company_name = Column(String(255), ForeignKey("top_stock.company_name"), primary_key=True)
    subscriptoin = Column(Boolean, default=False)   # 즐겨찾기 여부 (기본 false)
    notification = Column(Boolean, default=False)    # 알림 설정 여부 (기본 false)
    
    # 관계 설정
    user = relationship("User", back_populates="favorites")
    top_stock = relationship("TopStock", back_populates="favorites")
