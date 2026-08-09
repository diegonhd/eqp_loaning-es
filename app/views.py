from flask import Blueprint, render_template


views_bp = Blueprint("views", __name__)


@views_bp.route("/")
@views_bp.route("/front")
def dashboard():
    """Única interface web da aplicação."""
    return render_template("dashboard.html")
