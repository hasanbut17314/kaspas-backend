import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html, from = 'onboarding@resend.dev' }) => {
    try {
        const data = await resend.emails.send({
            from,
            to,
            subject,
            html,
        });

        return {
            success: true,
            data,
            message: 'Email sent successfully'
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to send email'
        };
    }
};

export const orderConfirmMailTemplate = (order) => {
    const orderItemsHTML = order.orderItems.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.prodId.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background-color: #4CAF50;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }
                .content {
                    background-color: #ffffff;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-top: none;
                    border-radius: 0 0 5px 5px;
                }
                .order-details {
                    margin: 20px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th {
                    background-color: #f5f5f5;
                    padding: 10px;
                    text-align: left;
                    border-bottom: 2px solid #ddd;
                }
                .total {
                    text-align: right;
                    font-weight: bold;
                    margin-top: 20px;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    color: #666;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Order Confirmation</h1>
                </div>
                <div class="content">
                    <p>Dear ${order.userId.firstName} ${order.userId.lastName},</p>
                    
                    <p>Thank you for your purchase! We're excited to let you know that your order has been confirmed and is being processed.</p>
                    
                    <div class="order-details">
                        <h2>Order Details</h2>
                        <p><strong>Order Number:</strong> ${order.order_no}</p>
                        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                        <p><strong>Shipping Address:</strong> ${order.address}</p>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th style="text-align: center;">Quantity</th>
                                    <th style="text-align: right;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orderItemsHTML}
                            </tbody>
                        </table>
                        
                        <div class="total">
                            <p>Total Amount: $${order.totalPrice.toFixed(2)}</p>
                        </div>
                    </div>
                    
                    <p>Your order has been confirmed and shipped successfully. You can track your order using the following link: <a href="${process.env.CLIENT_URL}/orders">Track your order</a></p>
                    
                    <p>If you have any questions about your order, please don't hesitate to contact our customer support team.</p>
                    
                    <p>Thank you for shopping with us!</p>
                    
                    <div class="footer">
                        <p>Best regards,<br>Kaspas Desserts</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};
