from app.models.models import Order, db

def fix_order_status():
    orders = Order.query.filter(Order.status == 'pending').all()
    for order in orders:
        order.status = 'PENDING'
    db.session.commit()
    print(f"Updated {len(orders)} orders from 'pending' to 'PENDING'.")

if __name__ == "__main__":
    fix_order_status()
