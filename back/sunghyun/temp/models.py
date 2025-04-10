from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship, foreign
from datetime import datetime
from database import Base

# 거래량 상위 10개 주식 테이블
class TopStock(Base):
    __tablename__ = "top_stock"
    
    company_name = Column(String(255), primary_key=True)   # 기업명 (PK)
    price = Column(String(20), nullable=False)             # 현재가
    volume = Column(String(50), nullable=False)            # 거래량
    ticker = Column(String(20), nullable=False)            # 티커
    date = Column(Date, nullable=False)                    # 크롤링 날짜

    favorites = relationship(
        "Favorite",
        back_populates="top_stock",
        primaryjoin="TopStock.company_name == foreign(Favorite.company_name)"
    )


# 사용자 테이블
class User(Base):
    __tablename__ = "user"
    
    id = Column(String(50), primary_key=True)
    user_name = Column(String(50), nullable=False)
    user_password = Column(String(255), nullable=False)
    user_email = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")


# 즐겨찾기 테이블
class Favorite(Base):
    __tablename__ = "favorite"
    
    user_id = Column(String(50), ForeignKey("user.id"), primary_key=True)
    company_name = Column(String(255), primary_key=True)
    subscriptoin = Column(Boolean, default=False)
    notification = Column(Boolean, default=False)

    user = relationship("User", back_populates="favorites")
    top_stock = relationship(
        "TopStock",
        back_populates="favorites",
        viewonly=True,
        primaryjoin="foreign(Favorite.company_name) == TopStock.company_name"
    )
