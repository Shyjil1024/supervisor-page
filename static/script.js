let currentClientId = null;
let editMode = false;
let selectedClient = null;
let selectedProducts = [];
let currentProduct = null;
let selectedSupplier = null;
function toggleMenu(button) {
    const menuContent = button.nextElementSibling;

    if (menuContent.classList.contains("hidden")) {
        menuContent.classList.remove("hidden");
    } else {
        menuContent.classList.add("hidden");
    }
}


// Toggle client details
document.querySelectorAll('.client-header').forEach(header => {
    header.addEventListener('click', function(e) {
        if (e.target.classList.contains('assign-btn') || e.target.classList.contains('menu-btn')) return;
        
        const clientBar = this.parentElement;
        const details = clientBar.querySelector('.client-details');
        const clientAddress = clientBar.querySelector('.client-address');
        const actionButtons = clientBar.querySelector('.client-actions');
        
        clientBar.classList.toggle('expanded');
        details.classList.toggle('hidden');
        clientAddress.classList.toggle('hidden');
        
        if (clientBar.classList.contains('expanded')) {
            actionButtons.classList.remove('hidden');
        } else {
            actionButtons.classList.add('hidden');
        }
    });
});

// Show assignment modal with data fetching
function showAssignModal(clientId) {
    currentClientId = clientId;
    selectedClient = null;
    selectedProducts = [];
    currentProduct = null;
    selectedSupplier = null;

    // Clear previous values
    document.getElementById('supplier-name-input').value = '';
    document.getElementById('product-name-input').value = '';
    document.getElementById('product-quantity').value = '';
    document.getElementById('selected-products').innerHTML = '';

    document.getElementById('assign-modal').style.display = 'block';
    
    document.getElementById('assignmentForm').dataset.clientId = clientId;
    document.getElementById('assignModal').classList.add('show');

    // Fetch suppliers
    console.log('Fetching suppliers...');
    fetch('/api/suppliers')
        .then(response => response.json())
        .then(suppliers => {
            console.log('Received suppliers:', suppliers);
            const supplierInput = document.getElementById('supplier-name-input');
            const suggestionsDiv = document.getElementById('supplier-suggestions');
            suggestionsDiv.innerHTML = '';

            suppliers.forEach(supplier => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = supplier.name;
                div.onclick = () => selectSupplier({
                    id: supplier._id,
                    name: supplier.name
                });
                suggestionsDiv.appendChild(div);
            });
        })
        .catch(error => console.error('Error fetching suppliers:', error));

    // Also fetch existing supplier for this client
    fetch(`/get_supplier_by_client_id?client_id=${clientId}`)
        .then(response => response.json())
        .then(data => {
            if (data.supplier) {
                selectSupplier({
                    id: data.supplier._id,
                    name: data.supplier.name
                });
            }
        })
        .catch(error => console.error('Error fetching existing supplier:', error));
}

// Show edit client modal
function showEditModal(clientId, name, address) {
    currentClientId = clientId;
    editMode = true;
    document.getElementById('client-name').value = name;
    document.getElementById('client-address').value = address;
    document.getElementById('add-client-modal').style.display = 'block';
}

// Add client button event listener
document.getElementById('add-client-btn')?.addEventListener('click', function() {
    editMode = false;
    document.getElementById('client-name').value = '';
    document.getElementById('client-address').value = '';
    document.getElementById('add-client-modal').style.display = 'block';
});

// Close modals
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Save client (add or edit)
function saveClient() {
    const name = document.getElementById('client-name').value;
    const address = document.getElementById('client-address').value;
    const url = editMode ? '/edit_client' : '/add_client';
    const body = editMode ? 
        `client_id=${currentClientId}&name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}` : 
        `name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`;

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            showError(data.message || 'Failed to save client');
        }
    })
    .catch(error => showError('An error occurred while saving'));
}

// Delete client
function deleteClient(clientId) {
    if (confirm('Are you sure you want to delete this client?')) {
        fetch('/delete_client', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `client_id=${clientId}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                showError(data.message || 'Failed to delete client');
            }
        })
        .catch(error => showError('An error occurred while deleting'));
    }
}

// Fetch current location
function fetchCurrentLocation() {
    fetch('/get_current_location')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('client-address').value = data.address;
            }
        })
        .catch(error => console.error('Error fetching location:', error));
}

function fetchSuggestions(inputId, suggestionsContainerId, apiEndpoint) {
    const input = document.getElementById(inputId);
    input.addEventListener('input', () => {
        const query = input.value;
        if (query.trim().length > 0) {
            fetch(`${apiEndpoint}?query=${query}`)
            .then(response => response.json())
            .then(data => {
                const suggestionsContainer = document.getElementById(suggestionsContainerId);
                suggestionsContainer.innerHTML = '';
                data.forEach(item => {
                    const suggestion = document.createElement('div');
                    suggestion.classList.add('suggestion-item');
                    suggestion.textContent = item.name;
                    suggestion.addEventListener('click', () => {
                        input.value = item.name;
                        suggestionsContainer.innerHTML = '';
                    });
                    suggestionsContainer.appendChild(suggestion);
                });
            });
        }
    });
}

// Call the function for supplier and product inputs
fetchSuggestions('supplier-name-input', 'supplier-suggestions', '/api/suppliers');
fetchSuggestions('product-name-input', 'product-suggestions', '/api/products');


// Select supplier
function selectSupplier(supplier) {
    console.log('Selected supplier:', supplier);
    selectedSupplier = supplier;
    document.getElementById('supplier-name-input').value = supplier.name;
    document.getElementById('supplier-suggestions').style.display = 'none';
}

// Select product
function selectProduct(product) {
    console.log('Selected product:', product);
    currentProduct = product;
    document.getElementById('product-name-input').value = product.name;
    document.getElementById('product-suggestions').style.display = 'none';
}

document.getElementById('add-product-btn').addEventListener('click', function () {
    const productName = document.getElementById('product-name-input').value.trim();
    const productQuantity = document.getElementById('product-quantity').value.trim();
  
    if (!productName || !productQuantity || isNaN(productQuantity) || productQuantity <= 0) {
      alert('Please enter a valid product name and quantity.');
      return;
    }
  
    // Add product to the list
    selectedProducts.push({ name: productName, quantity: productQuantity });
  
    // Update the UI
    const selectedProductsContainer = document.getElementById('selected-products');
    selectedProductsContainer.innerHTML = ''; // Clear existing list
    selectedProducts.forEach(product => {
      const productItem = document.createElement('div');
      productItem.textContent = `${product.name} - Quantity: ${product.quantity}`;
      selectedProductsContainer.appendChild(productItem);
    });
  
    // Clear input fields
    document.getElementById('product-name-input').value = '';
    document.getElementById('product-quantity').value = '';
  });
  

// Update products list display
function updateProductsList() {
    const container = document.getElementById('selected-products');
    container.innerHTML = '';

    selectedProducts.forEach((product, index) => {
        const div = document.createElement('div');
        div.className = 'selected-product';
        div.innerHTML = `
            <span>${product.name} - Quantity: ${product.quantity}</span>
            <span class="remove-product" onclick="removeProduct(${index})">×</span>
        `;
        container.appendChild(div);
    });
}

// Remove product from selection
function removeProduct(index) {
    selectedProducts.splice(index, 1);
    updateProductsList();
}

// Find the existing saveAssignment function and replace it with this code:
function saveAssignment() {
    const clientId = currentClientId;
    const supplier = document.getElementById('supplier-name-input').value;
    
    if (!clientId || !supplier || selectedProducts.length === 0) {
        showError('Please select a supplier and at least one product');
        return;
    }

    fetch('/assign', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: clientId,
            supplier: supplier,
            products: selectedProducts
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('Assignment saved successfully');
            closeModal('assign-modal');
// Update the assign button and display the assigned supplier
            const clientBar = document.querySelector(`.client-bar[data-client-id="${clientId}"]`);
            const assignButton = clientBar.querySelector('.assign-btn');
            const assignedSupplierText = clientBar.querySelector('.assigned-supplier');
            
            if (assignButton) {
                assignButton.textContent = "Assigned";
                assignButton.disabled = true; // Disable the button after assignment
                assignButton.classList.add("btn-disabled");            
                }

            if (assignedSupplierText) {
                assignedSupplierText.textContent = `Assigned to: ${supplier}`;
                assignedSupplierText.style.display = "block"; // Ensure it's visible
            }
            } else {
            showError(data.message || 'Failed to save assignment');
        }
    })
    .catch(error => {
        showError('An error occurred while saving the assignment');
        console.error('Error:', error);
    });
}

// Add these two functions to handle showing and deleting orders:
function showOrder(clientId) {
    fetch(`/show_order/${clientId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success !== false) {
                const productsList = data.products.map(p => 
                    `${p.name} - Quantity: ${p.quantity}`
                ).join('\n');
                alert(`Supplier: ${data.supplier}\nProducts:\n${productsList}`);
            } else {
                alert(data.message || "No order found.");
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error fetching order details');
        });
}


function deleteOrder(clientId) {
    if (confirm('Are you sure you want to delete this order?')) {
        fetch(`/delete_order/${clientId}`, { 
            method: 'DELETE' 
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Order deleted successfully');
                location.reload();
            } else {
                alert(data.message || 'Failed to delete order');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error deleting order');
        });
    }
}

// Utility functions
function showError(message) {
    const errorDiv = document.getElementById('assignment-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('assignment-success');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Test database connection
function testDatabaseConnection() {
    console.log('Testing database connection...');
    fetch('/test_db')
        .then(response => response.json())
        .then(data => {
            console.log('Database test results:', data);
            alert(JSON.stringify(data, null, 2));
        })
        .catch(error => {
            console.error('Database test error:', error);
            alert('Error testing database: ' + error.message);
        });
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing event listeners...');
    
    // Add input event listeners
    const supplierInput = document.getElementById('supplier-name-input');
    if (supplierInput) {
        supplierInput.addEventListener('input', handleSupplierSearch);
        console.log('Supplier input listener added');
    }
    
    const productInput = document.getElementById('product-name-input');
    if (productInput) {
        productInput.addEventListener('input', handleProductSearch);
        console.log('Product input listener added');
    }

    // Add click events for closing dropdowns when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.matches('.suggestion-item') && !event.target.matches('#supplier-name-input')) {
            document.getElementById('supplier-suggestions').style.display = 'none';
        }
        if (!event.target.matches('.suggestion-item') && !event.target.matches('#product-name-input')) {
            document.getElementById('product-suggestions').style.display = 'none';
        }
    });

    // Add test database button
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Database';
    testButton.onclick = testDatabaseConnection;
    testButton.style.position = 'fixed';
    testButton.style.bottom = '20px';
    testButton.style.right = '20px';
    document.body.appendChild(testButton);
    
    const menuButtons = document.querySelectorAll('.menu-btn');
    menuButtons.forEach((button) => {
    button.addEventListener('click', function (event) {
        event.stopPropagation(); // Prevent the event from propagating to other elements
        toggleMenu(this); // Use the `toggleMenu` function
    });
});


    

// Toggle visibility of the 3-dot menu
document.addEventListener('click', function (event) {
    if (event.target.classList.contains('menu-btn')) {
      const menuContent = event.target.nextElementSibling; // Get the menu content
      menuContent.classList.toggle('hidden'); // Toggle 'hidden' class
    } else {
      // Close all menus if clicking outside
      document.querySelectorAll('.menu-content').forEach(menu => menu.classList.add('hidden'));
    }
  });
});
