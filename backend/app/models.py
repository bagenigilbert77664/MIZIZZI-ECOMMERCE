from . import db

class PesapalTransaction(db.Model):
    __tablename__ = "pesapal_transactions"

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), nullable=False)
    transaction_id = db.Column(db.String(100), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)

    def __repr__(self):
        return f"<PesapalTransaction {self.transaction_id} - Amount: {self.amount} - Status: {self.status}>"