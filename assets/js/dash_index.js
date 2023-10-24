var font = null, excel_table = null, formula = null;

const header = [
    {"name": "Sales Order Number", "notes": "Unique identifier for the order", "uuid": "5728a7a3-14ec-4ab9-84cc-9b4bf2b7b54d"},
    {"name": "Customer Information", "notes": "Details about the customer", "uuid": "adfc8efb-2b0b-48c0-9590-02ab0121c3a0"},
    {"name": "Order Date", "notes": "Date when the order was created", "uuid": "f98f7855-9153-4d15-a51d-81165e07907a"},
    {"name": "Order Status", "notes": "Current order status", "uuid": "d3cda058-ee7a-4f35-95c5-15061cc1dbf6"},
    {"name": "Sales Representative", "notes": "Responsible salesperson", "uuid": "a3f9e1b4-372b-4ee7-b1f9-1475f3ce798c"},
    {"name": "Product/Item Description", "notes": "Description of items", "uuid": "9d1341c6-79d7-462d-9e92-e1e74eb77c31"},
    {"name": "Quantity", "notes": "Number of units/items", "uuid": "be405d47-3ea0-437e-9f19-40d52b08ce05"},
    {"name": "Unit Price", "notes": "Price per unit", "uuid": "a0ff0d25-1d67-49db-a558-c1da5ab6dd94"},
    {"name": "Total Price", "notes": "Total cost per line", "uuid": "f34fcf56-9a63-46d0-b441-d174e6fb0f0e"},
    {"name": "Tax", "notes": "Applicable tax amount", "uuid": "4c484b8f-03ed-44db-97eb-95ebf0b3ce77"},
    {"name": "Shipping Method", "notes": "Chosen delivery method", "uuid": "dabac34c-c24a-454b-bb97-3c31eabfd772"},
    {"name": "Payment Information", "notes": "Payment details", "uuid": "d6f2a82e-85c7-4df4-8a93-b0c8de80107c"},
    {"name": "Special Instructions", "notes": "Additional order notes", "uuid": "2f2d470e-2670-49c3-b340-19b45a69d1b5"},
    {"name": "Subtotal", "notes": "Total before tax/shipping", "uuid": "b312d06d-6c4f-4d92-8c84-9e59c5d548a0"},
    {"name": "Order Total", "notes": "Total order cost", "uuid": "3b27d83a-90b6-4b08-a88a-bd2351735e3e"},
    {"name": "Payment Status", "notes": "Payment status (received or pending)", "uuid": "ed7c51da-22d5-4a95-bf25-5b409557a5ac"},
    {"name": "Order Notes", "notes": "Additional order comments", "uuid": "f8f99b94-c85e-4ef0-89b0-ecdd080f08e4"},
    {"name": "Delivery Date", "notes": "Expected delivery date", "uuid": "e4f2d15d-8c7b-4f3a-bcaf-0d3c3f7fffc4"},
    {"name": "Order Source", "notes": "Order origin (e.g., online or in-store)", "uuid": "6f43c8f0-3e49-456f-8e82-01ab08dd943e"},
    {"name": "Discounts", "notes": "Applied discounts", "uuid": "8e1d28d1-5c6a-47b3-8f86-84fbcce9c8e3"},
    {"name": "Order Line Status", "notes": "Status of each line in the order", "uuid": "9a5c73e9-437e-4a5e-bda3-fb68ac7dc9cd"}
  ];

const data = [
    {
      "data": [
        {"value": "SO12345", "uuid": "5728a7a3-14ec-4ab9-84cc-9b4bf2b7b54d", "styles": {fontSize: 23, fontWeight: "bold"}},
        {"value": "John Doe", "uuid": "adfc8efb-2b0b-48c0-9590-02ab0121c3a0"},
        {"value": "2023-10-15", "uuid": "f98f7855-9153-4d15-a51d-81165e07907a"},
        {"value": "Confirmed", "uuid": "d3cda058-ee7a-4f35-95c5-15061cc1dbf6"},
        {"value": "Alice Smith", "uuid": "a3f9e1b4-372b-4ee7-b1f9-1475f3ce798c"},
        {"value": "Widget A", "uuid": "9d1341c6-79d7-462d-9e92-e1e74eb77c31"},
        {"value": "10", "uuid": "be405d47-3ea0-437e-9f19-40d52b08ce05"},
        {"value": "25.00", "uuid": "a0ff0d25-1d67-49db-a558-c1da5ab6dd94"},
        {"value": "250.00", "uuid": "f34fcf56-9a63-46d0-b441-d174e6fb0f0e"},
        {"value": "12.50", "uuid": "4c484b8f-03ed-44db-97eb-95ebf0b3ce77"},
        {"value": "Standard", "uuid": "dabac34c-c24a-454b-bb97-3c31eabfd772"},
        {"value": "Visa ending in 1234", "uuid": "d6f2a82e-85c7-4df4-8a93-b0c8de80107c"},
        {"value": "Handle with care", "uuid": "2f2d470e-2670-49c3-b340-19b45a69d1b5"},
        {"value": "225.00", "uuid": "b312d06d-6c4f-4d92-8c84-9e59c5d548a0"},
        {"value": "262.50", "uuid": "3b27d83a-90b6-4b08-a88a-bd2351735e3e"},
        {"value": "Paid", "uuid": "ed7c51da-22d5-4a95-bf25-5b409557a5ac"},
        {"value": "Thank you for your order.", "uuid": "f8f99b94-c85e-4ef0-89b0-ecdd080f08e4"},
        {"value": "2023-10-20", "uuid": "e4f2d15d-8c7b-4f3a-bcaf-0d3c3f7fffc4"},
        {"value": "Online Store", "uuid": "6f43c8f0-3e49-456f-8e82-01ab08dd943e"},
        {"value": "5.00", "uuid": "8e1d28d1-5c6a-47b3-8f86-84fbcce9c8e3"},
        {"value": "In Stock", "uuid": "9a5c73e9-437e-4a5e-bda3-fb68ac7dc9cd"}
      ],
      "rowID": "1"
    },
    {
      "data": [
        {"value": "SO54321", "uuid": "5728a7a3-14ec-4ab9-84cc-9b4bf2b7b54d"},
        {"value": "Jane Smith", "uuid": "adfc8efb-2b0b-48c0-9590-02ab0121c3a0"},
        {"value": "2023-10-16", "uuid": "f98f7855-9153-4d15-a51d-81165e07907a"},
        {"value": "Pending", "uuid": "d3cda058-ee7a-4f35-95c5-15061cc1dbf6"},
        {"value": "Bob Johnson", "uuid": "a3f9e1b4-372b-4ee7-b1f9-1475f3ce798c"},
        {"value": "Gadget B", "uuid": "9d1341c6-79d7-462d-9e92-e1e74eb77c31"},
        {"value": "15", "uuid": "be405d47-3ea0-437e-9f19-40d52b08ce05"},
        {"value": "20.00", "uuid": "a0ff0d25-1d67-49db-a558-c1da5ab6dd94"},
        {"value": "300.00", "uuid": "f34fcf56-9a63-46d0-b441-d174e6fb0f0e"},
        {"value": "15.00", "uuid": "4c484b8f-03ed-44db-97eb-95ebf0b3ce77"},
        {"value": "Express", "uuid": "dabac34c-c24a-454b-bb97-3c31eabfd772"},
        {"value": "MasterCard ending in 5678", "uuid": "d6f2a82e-85c7-4df4-8a93-b0c8de80107c"},
        {"value": "Fragile items", "uuid": "2f2d470e-2670-49c3-b340-19b45a69d1b5"},
        {"value": "450.00", "uuid": "b312d06d-6c4f-4d92-8c84-9e59c5d548a0"},
        {"value": "480.00", "uuid": "3b27d83a-90b6-4b08-a88a-bd2351735e3e"},
        {"value": "Pending", "uuid": "ed7c51da-22d5-4a95-bf25-5b409557a5ac"},
        {"value": "Please deliver before 5 PM", "uuid": "f8f99b94-c85e-4ef0-89b0-ecdd080f08e4"},
        {"value": "2023-10-18", "uuid": "e4f2d15d-8c7b-4f3a-bcaf-0d3c3f7fffc4"},
        {"value": "Phone Order", "uuid": "6f43c8f0-3e49-456f-8e82-01ab08dd943e"},
        {"value": "10.00", "uuid": "8e1d28d1-5c6a-47b3-8f86-84fbcce9c8e3"},
        {"value": "Backordered", "uuid": "9a5c73e9-437e-4a5e-bda3-fb68ac7dc9cd"}
      ],
      "rowID": "2"
    },
    {
      "data": [
        {"value": "SO98765", "uuid": "5728a7a3-14ec-4ab9-84cc-9b4bf2b7b54d"},
        {"value": "Robert Johnson", "uuid": "adfc8efb-2b0b-48c0-9590-02ab0121c3a0"},
        {"value": "2023-10-17", "uuid": "f98f7855-9153-4d15-a51d-81165e07907a"},
        {"value": "Shipped", "uuid": "d3cda058-ee7a-4f35-95c5-15061cc1dbf6"},
        {"value": "Emily Brown", "uuid": "a3f9e1b4-372b-4ee7-b1f9-1475f3ce798c"},
        {"value": "Tool C", "uuid": "9d1341c6-79d7-462d-9e92-e1e74eb77c31"},
        {"value": "5", "uuid": "be405d47-3ea0-437e-9f19-40d52b08ce05"},
        {"value": "30.00", "uuid": "a0ff0d25-1d67-49db-a558-c1da5ab6dd94"},
        {"value": "150.00", "uuid": "f34fcf56-9a63-46d0-b441-d174e6fb0f0e"},
        {"value": "7.50", "uuid": "4c484b8f-03ed-44db-97eb-95ebf0b3ce77"},
        {"value": "Priority", "uuid": "dabac34c-c24a-454b-bb97-3c31eabfd772"},
        {"value": "Discover ending in 9876", "uuid": "d6f2a82e-85c7-4df4-8a93-b0c8de80107c"},
        {"value": "Fragile items", "uuid": "2f2d470e-2670-49c3-b340-19b45a69d1b5"},
        {"value": "225.00", "uuid": "b312d06d-6c4f-4d92-8c84-9e59c5d548a0"},
        {"value": "242.50", "uuid": "3b27d83a-90b6-4b08-a88a-bd2351735e3e"},
        {"value": "Paid", "uuid": "ed7c51da-22d5-4a95-bf25-5b409557a5ac"},
        {"value": "Leave at the front porch", "uuid": "f8f99b94-c85e-4ef0-89b0-ecdd080f08e4"},
        {"value": "2023-10-19", "uuid": "e4f2d15d-8c7b-4f3a-bcaf-0d3c3f7fffc4"},
        {"value": "In-Store Purchase", "uuid": "6f43c8f0-3e49-456f-8e82-01ab08dd943e"},
        {"value": "0.00", "uuid": "8e1d28d1-5c6a-47b3-8f86-84fbcce9c8e3"},
        {"value": "Discontinued", "uuid": "9a5c73e9-437e-4a5e-bda3-fb68ac7dc9cd"}
      ],
      "rowID": "3"
    }
  ]
  ;


$(function(){

    formula = new formula_maker(document.querySelector(".excel_formula_input"), document.querySelector(".excel_formula--list"));
    formula.init_fns();

    font = new font_changer(document.querySelector(".font_group"));
    font.init();

    excel_table = new excel(header, data, document.querySelector(".excel_table"), font, formula);
    excel_table.init();
})