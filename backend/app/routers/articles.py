from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Article, Category, User
from app.schemas import ArticleCreate, ArticleOut, ArticleUpdate
from app.services import get_current_user, require_roles

router = APIRouter(prefix="/articles", tags=["knowledge-base"])


@router.post("", response_model=ArticleOut, status_code=status.HTTP_201_CREATED)
def create_article(
    payload: ArticleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    if payload.category_id is not None and not db.get(Category, payload.category_id):
        raise HTTPException(status_code=400, detail="category_id does not exist")
    article = Article(**payload.model_dump(), created_by=user.id)
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@router.get("", response_model=list[ArticleOut])
def list_articles(
    category_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Article)
    if category_id is not None:
        q = q.filter(Article.category_id == category_id)
    return q.order_by(Article.id.desc()).all()


@router.get("/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.patch("/{article_id}", response_model=ArticleOut)
def update_article(
    article_id: int,
    payload: ArticleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "manager")),
):
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    values = payload.model_dump(exclude_unset=True)
    if "category_id" in values and values["category_id"] is not None and not db.get(Category, values["category_id"]):
        raise HTTPException(status_code=400, detail="category_id does not exist")
    for field, value in values.items():
        setattr(article, field, value)
    db.commit()
    db.refresh(article)
    return article


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin", "manager")),
):
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
