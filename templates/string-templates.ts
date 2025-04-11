export const dailyOrderNotificationTemplate = `Dear Store Owner,

A new daily order report has been generated and is now available for your review.

Report Date: {{currentDate}}

Number of Orders Today: {{totalOrders}}

Total Revenue: \${{grandTotal}}

You can view and download the detailed report by clicking on the link below:
{{presignedURL}}

Thank you for choosing our platform!

Best Regards,
Online Shop`

export const dailyOrderReportHtmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Daily Order Report</title>
    <style>
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    <h1>Daily Order Report</h1>
    <h3>Date: {{currentDate}}</h3>

    <table>
        <thead>
            <tr>
                <th>Customer ID</th>
                <th>Email</th>
                <th>Shipping Address</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price (Per Item)</th>
                <th>Total Price</th>
            </tr>
        </thead>
        <tbody>
            {{#each orders}}
            <tr>
                <td>{{this.customerId}}</td>
                <td>{{this.email}}</td>
                <td>{{this.shippingAddress}}</td>
                <td>{{this.productName}}</td>
                <td>{{this.quantity}}</td>
                <td>\${{this.pricePerItem}}</td>
                <td>\${{this.totalPrice}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>

    <p><strong>Total Price for All Orders: \${{grandTotal}}</strong></p>
</body>
</html>`

export const feedbackRequestEmailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Feedback</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: auto;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            font-size: 24px;
            margin-bottom: 20px;
        }
        .details {
            margin-bottom: 10px;
        }
        .footer {
            font-size: 12px;
            color: #888;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            We value your feedback!
        </div>
        <div class="details">
            <strong>Hello {{ customerName }}!</strong>
            <p>We hope you enjoyed your recent purchase. We would love to hear your feedback!</p>
            <a href="https://example.com">Leave Feedback</a>
        </div>
        <div class="footer">
            If you have any questions or need further information, please contact our customer service at support@onlineshop.com.
        </div>
    </div>
</body>
</html>`

export const orderReceivedEmailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: auto;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            font-size: 24px;
            margin-bottom: 20px;
        }
        .details {
            margin-bottom: 10px;
        }
        .footer {
            font-size: 12px;
            color: #888;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            Thank You for Your Order!
        </div>
        <div class="details">
            <strong>Order ID:</strong> {{order_id}}<br>
            <strong>Customer Name:</strong> {{customer_name}}<br>
            <strong>Email:</strong> {{customer_email}}<br>
            <strong>Shipping Address:</strong> {{shipping_address}}<br>
            <strong>Order Details:</strong> 
            <ul>
                <!-- Use Handlebars' #each helper to loop through order details -->
                {{#each order_details}}
                    <li>{{this.product_name}} - Quantity: {{this.quantity}}</li>
                {{/each}}
            </ul>
            <strong>Total Amount:</strong> {{total_amount}}
        </div>
        <div class="footer">
            If you have any questions or need further information, please contact our customer service at support@onlineshop.com.
        </div>
    </div>
</body>
</html>`

export const ShipmentApprovalRequestTemplate = `Dear Store Owner,

A new order with ID {{ orderId }} has been placed by {{ customerName }}.

To approve the shipment, click the link below:
{{ approvalLambdaUrl }}?orderId={{orderId}}&taskToken={{taskToken}}&result=approve

To reject the shipment, click the link below:
{{ approvalLambdaUrl }}?orderId={{orderId}}&taskToken={{taskToken}}&result=reject

Thank you,
Online Shop`

export const ShipmentConfirmedTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shipment Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: auto;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            font-size: 24px;
            margin-bottom: 20px;
        }
        .details {
            margin-bottom: 10px;
        }
        .footer {
            font-size: 12px;
            color: #888;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            Your Shipment is on its Way!
        </div>
        <div class="details">
            <strong>Great news, {{ customerName }}!</strong>
            <p>Your order with ID {{ orderId }} is on its way. We hope you enjoy your purchase!</p>
        </div>
        <div class="footer">
            If you have any questions or need further information, please contact our customer service at support@onlineshop.com.
        </div>
    </div>
</body>
</html>`

export const ShipmentRejectedTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shipment Cancelled</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: auto;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            font-size: 24px;
            margin-bottom: 20px;
            color: #c70000;
        }
        .details {
            margin-bottom: 10px;
        }
        .footer {
            font-size: 12px;
            color: #888;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            We're Sorry - Your Shipment was Cancelled.
        </div>
        <div class="details">
            <strong>Dear {{ customerName }},</strong>
            <p>We regret to inform you that your order with ID {{ orderId }} has been cancelled due to unforeseen circumstances. We understand this may be disappointing and sincerely apologize for the inconvenience.</p>
            <p>Please contact our customer service team to explore alternative solutions or for further details on the reason for the cancellation.</p>
        </div>
        <div class="footer">
            We value your business and are here to assist. Please reach out to us at support@onlineshop.com with any concerns or questions.
        </div>
    </div>
</body>
</html>`