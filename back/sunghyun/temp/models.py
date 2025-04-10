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

    # Favorite과의 관계 (외래키 제거했기 때문에 primaryjoin 명시 필요)
    favorites = relationship(
        "Favorite",
        back_populates="top_stock",
        primaryjoin="TopStock.company_name == Favorite.company_name"
    )


# 사용자 테이블
class User(Base):
    __tablename__ = "user"
    
    id = Column(String(50), primary_key=True)                   # 사용자 고유 ID
    user_name = Column(String(50), nullable=False)              # 사용자명
    user_password = Column(String(255), nullable=False)         # 비밀번호
    user_email = Column(String(100), unique=True, nullable=False)  # 이메일
    created_at = Column(DateTime, default=datetime.utcnow)      # 가입 시각

    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")


# 즐겨찾기 테이블
class Favorite(Base):
    __tablename__ = "favorite"
    
    user_id = Column(String(50), ForeignKey("user.id"), primary_key=True)
    company_name = Column(String(255), primary_key=True)
    subscriptoin = Column(Boolean, default=False)
    notification = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="favorites")

    # 관계는 유지하지만 viewonly=True로 명시, primaryjoin 직접 설정
    top_stock = relationship(
        "TopStock",
        back_populates="favorites",
        viewonly=True,
        primaryjoin="Favorite.company_name == TopStock.company_name"
    )
