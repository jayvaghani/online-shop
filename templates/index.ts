import handlebars from "handlebars"
import * as stringTemplates from "./string-templates"

// import orderReceivedEmailSource from '../../templates/order-received-email.html';
// import shipmentConfirmedSource from '../../templates/shipment-confirmed.html';
// import shipmentRejectedSource from '../../templates/shipment-rejected.html';
// import shipmentApprovalRequestSource from '../../templates/shipment-approval-request.html';
// import dailyOrderReportSource from '../../templates/daily-order-report.html';
// import dailyNotificationSource from '../../templates/daily-order-notification.txt';
// import feedbackRequestEmailSource from '../../templates/feedback-request-email.html';

// console.log("direct import",orderReceivedEmailSource);
// console.log("file read import",fs.readFileSync(path.join(__dirname, 'order-received-email.html')));

// export const orderReceivedEmailTemplate = handlebars.compile(orderReceivedEmailSource);
// export const shipmentConfirmationTemplate = handlebars.compile(shipmentConfirmedSource);
// export const shipmentRejectedTemplate = handlebars.compile(shipmentRejectedSource);
// export const shipmentApprovalRequestTemplate = handlebars.compile(shipmentApprovalRequestSource);
// export const dailyOrderReportTemplate = handlebars.compile(dailyOrderReportSource);
// export const dailyOrderNotificationTemplate = handlebars.compile(dailyNotificationSource);
// export const feedbackRequestEmailTemplate = handlebars.compile(feedbackRequestEmailSource);



// export const orderReceivedEmailTemplate = handlebars.compile(fs.readFileSync(path.join(__dirname, 'order-received-email.html'), 'utf-8'));
// export const shipmentConfirmationTemplate = handlebars.compile(fs.readFileSync(path.join(__dirname, 'shipment-confirmed.html'), 'utf-8'));
// export const shipmentRejectedTemplate = handlebars.compile(fs.readFileSync(path.join(__dirname, 'shipment-rejected.html'), 'utf-8'));
// export const shipmentApprovalRequestTemplate = handlebars.compile(fs.readFileSync(path.join(__dirname, 'shipment-approval-request.html'), 'utf-8'));
// export const dailyOrderReportTemplate = handlebars.compile(fs.readFileSync(path.join(__dirname, 'daily-order-report.html'), 'utf-8'));
// export const dailyOrderNotificationTemplate = handlebars.compile(fs.readFileSync(path.join(__dirname, 'daily-order-notification.txt'), 'utf-8'));
// export const feedbackRequestEmailTemplate = handlebars.compile(fs.readFileSync(path.join(__dirname, 'feedback-request-email.html'), 'utf-8'));

export const orderReceivedEmailTemplate = handlebars.compile(stringTemplates.orderReceivedEmailTemplate);
export const shipmentConfirmationTemplate = handlebars.compile(stringTemplates.ShipmentConfirmedTemplate);
export const shipmentRejectedTemplate = handlebars.compile(stringTemplates.ShipmentRejectedTemplate);
export const shipmentApprovalRequestTemplate = handlebars.compile(stringTemplates.ShipmentApprovalRequestTemplate);
export const dailyOrderReportTemplate = handlebars.compile(stringTemplates.dailyOrderReportHtmlTemplate);
export const dailyOrderNotificationTemplate = handlebars.compile(stringTemplates.dailyOrderNotificationTemplate);
export const feedbackRequestEmailTemplate = handlebars.compile(stringTemplates.feedbackRequestEmailTemplate);