from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_pymongo import PyMongo
from bson import ObjectId
import requests
from datetime import datetime

app = Flask(__name__)
app.config["MONGO_URI"] = "mongodb://localhost:27017/navigating_site"
mongo = PyMongo(app)

clients_collection = mongo.db.clients
suppliers_collection = mongo.db.suppliers
assignments_collection = mongo.db.assignments
products_collection = mongo.db.products

@app.route('/')
def supervisor_dashboard():
    clients = list(clients_collection.find())
    suppliers = list(suppliers_collection.find())

    for client in clients:
        assignment = assignments_collection.find_one({"client_id": str(client["_id"])})
        if assignment:
            client["assigned_supplier"] = assignment["supplier_name"]
        else:
            client["assigned_supplier"] = None

    return render_template("supervisor.html", clients=clients, suppliers=suppliers)

@app.route('/add_client', methods=['POST'])
def add_client():
    new_client = {
        "name": request.form.get('name'),
        "address": request.form.get('address')
    }
    result = clients_collection.insert_one(new_client)
    return jsonify({"success": True, "client_id": str(result.inserted_id)})

@app.route('/edit_client', methods=['POST'])
def edit_client():
    client_id = request.form.get('client_id')
    updated_data = {
        "name": request.form.get('name'),
        "address": request.form.get('address')
    }
    clients_collection.update_one({"_id": ObjectId(client_id)}, {"$set": updated_data})
    return jsonify({"success": True})

@app.route('/delete_client', methods=['POST'])
def delete_client():
    client_id = request.form.get('client_id')
    clients_collection.delete_one({"_id": ObjectId(client_id)})
    assignments_collection.delete_many({"client_id": client_id})
    return jsonify({"success": True})

@app.route('/assign_client_to_supplier', methods=['POST'])
def assign_client_to_supplier():
    client_id = request.form.get('client_id')
    supplier_id = request.form.get('supplier_id') 

    client = clients_collection.find_one({"_id": ObjectId(client_id)})
    supplier = suppliers_collection.find_one({"_id": ObjectId(supplier_id)})

    if not assignments_collection.find_one({"client_id": client_id}):
        assignments_collection.insert_one({
            "client_id": client_id,
            "supplier_id": supplier_id,  # Use supplier_id here
            "client_name": client["name"],
            "supplier_name": supplier["name"]
        })
        return jsonify({"success": True, "supplier_name": supplier["name"]})
    return jsonify({"success": False, "message": "Client already assigned"})

@app.route('/get_current_location', methods=['GET'])
def get_current_location():
    try:
        response = requests.get('http://ip-api.com/json/')
        data = response.json()
        if data['status'] == 'success':
            location = f"{data['lat']},{data['lon']}"
            return jsonify({"success": True, "address": location})
        else:
            return jsonify({"success": False, "message": "Unable to fetch location"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route('/search_clients', methods=['GET'])
def search_clients():
    query = request.args.get('query', '')
    clients = list(clients_collection.find(
        {"name": {"$regex": query, "$options": "i"}},
        {"_id": 1, "name": 1}
    ))
    return jsonify([{
        "id": str(client["_id"]),
        "name": client["name"]
    } for client in clients])

@app.route('/')

@app.route('/')
def index():
    return render_template('index.html')

# Update your existing supplier and product routes to handle errors properly
@app.route('/api/suppliers', methods=['GET'])
def get_suppliers():
    try:
        suppliers = list(suppliers_collection.find({}, {"name": 1}))
        return jsonify([{
            "_id": str(supplier["_id"]),
            "name": supplier["name"]
        } for supplier in suppliers])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        products = list(products_collection.find({}, {"name": 1}))
        return jsonify([{
            "_id": str(product["_id"]),
            "name": product["name"]
        } for product in products])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_supplier_by_client_id', methods=['GET'])
def get_supplier_by_client_id():
    client_id = request.args.get('client_id')
    assignment = assignments_collection.find_one({"client_id": client_id})
    if assignment:
        supplier = suppliers_collection.find_one({"_id": ObjectId(assignment["supplier_id"])})
        return jsonify({"supplier": supplier})
    return jsonify({"supplier": None})

@app.route('/assign_client', methods=['POST'])
def assign_client():
    try:
        data = request.json
        client_id = data.get('client_id')
        supplier_id = data.get('supplier_id')
        product_id = data.get('product_id')

        client = clients_collection.find_one({'_id': ObjectId(client_id)})

        if not client:
            return jsonify({'success': False, 'message': 'Client not found'}), 404

        # Validate that supplier and product exist
        supplier = suppliers_collection.find_one({"_id": ObjectId(supplier_id)})
        product = products_collection.find_one({"_id": ObjectId(product_id)})
        
        

        if not client_id or not supplier_id or not product_id:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        


        # Create the assignment
        assignment = {
            "supplier_id": supplier_id,
            "product_id": product_id,
            "supplier_name": supplier["name"],
            "product_name": product["name"],
            "created_at": datetime.utcnow()
        }

        result = assignments_collection.insert_one(assignment)

        clients_collection.update_one(
            {"_id": ObjectId(client_id)},
            {
                "$set": {
                    "assigned_supplier": supplier,
                    "assigned_product": product,
                }
            }
        )
        return jsonify({
            "success": True,
            "assignment_id": str(result.inserted_id)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        })

# Find this existing route in app.py:
@app.route('/assign', methods=['POST'])
def assign():
    # Replace the entire function with this updated code:
    try:
        data = request.json
        client_id = data.get('client_id')
        supplier = data.get('supplier')
        products = data.get('products', [])

        # Validate client exists
        client = clients_collection.find_one({"_id": ObjectId(client_id)})
        if not client:
            return jsonify({"success": False, "message": "Client not found"}), 404

        # Update client with assignment
        update_result = clients_collection.update_one(
            {"_id": ObjectId(client_id)},
            {
                "$set": {
                    "assigned_supplier": supplier,
                    "assigned_products": products,
                    "assignment_date": datetime.utcnow()
                }
            }
        )

        if update_result.modified_count > 0:
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "Failed to update assignment"}), 500

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500




# Add these two new routes after your existing routes in app.py:
@app.route('/show_order/<client_id>', methods=['GET'])
def show_order(client_id):
    try:
        client = clients_collection.find_one({"_id": ObjectId(client_id)})
        if client and "assigned_supplier" in client:
            return jsonify({
                "success": True,
                "supplier": client.get("assigned_supplier"),
                "products": client.get("assigned_products", [])
            })
        return jsonify({"success": False, "message": "No order found"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/delete_order/<client_id>', methods=['DELETE'])
def delete_order(client_id):
    try:
        update_result = clients_collection.update_one(
            {"_id": ObjectId(client_id)},
            {
                "$unset": {
                    "assigned_supplier": "",
                    "assigned_products": "",
                    "assignment_date": ""
                }
            }
        )
        if update_result.modified_count > 0:
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "No order found to delete"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
        
        
if __name__ == "__main__":
    app.run(debug=True)