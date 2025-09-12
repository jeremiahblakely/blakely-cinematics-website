/**
 * TemplateService.js - Email Template Management
 * Path: /modules/admin/services/TemplateService.js
 * Created: September 12, 2025 8:30 AM
 */

export default class TemplateService {
    constructor() {
        this.templates = {
            booking_confirmation: {
                name: 'Booking Confirmation',
                subject: 'Booking Confirmed - {{date}}',
                body: `Hi {{clientName}},

I'm excited to confirm your booking for {{date}} at {{location}}.

Here are the details:
- Date: {{date}}
- Time: {{time}}
- Location: {{location}}
- Package: {{package}}
- Duration: {{duration}}

What to expect:
• I'll arrive 30 minutes early for setup
• We'll start with establishing shots
• Multiple outfit changes are welcome
• You'll receive previews within 48 hours

Please let me know if you have any questions!`
            },
            inquiry_response: {
                name: 'Inquiry Response',
                subject: 'Re: Photography Inquiry',
                body: `Hi {{clientName}},

Thank you for reaching out about your upcoming {{eventType}}!

I'd love to learn more about your vision. Could you share:
- Your preferred date(s)
- Location or venue
- Approximate guest count
- Style preferences (documentary, artistic, traditional)

I have availability on {{availableDates}} and would be honored to capture your special moments.

My {{eventType}} packages start at {{startingPrice}} and include:
• Full day coverage
• Professional editing
• Online gallery with downloads
• Print rights

Would you like to schedule a call to discuss further?`
            },
            gallery_ready: {
                name: 'Gallery Ready',
                subject: 'Your Gallery is Ready! 🎉',
                body: `Hi {{clientName}},

Great news - your photos are ready!

🔗 View your gallery: {{galleryLink}}
📱 Password: {{galleryPassword}}

Your gallery includes:
• {{photoCount}} professionally edited photos
• High-resolution downloads
• Option to order prints
• Shareable link for family & friends

The gallery will be available for {{duration}} days. Feel free to download everything!

Thank you for trusting me to capture these moments.`
            },
            payment_reminder: {
                name: 'Payment Reminder',
                subject: 'Friendly Payment Reminder',
                body: `Hi {{clientName}},

Just a gentle reminder that your balance of {{amount}} for the {{date}} shoot is due.

Payment options:
• Online: {{paymentLink}}
• Venmo: @blakely-cinematics
• Check: Made out to Blakely Cinematics

Once payment is received, I'll send over your final gallery access.

Let me know if you have any questions!`
            }
        };
    }
    
    getTemplate(id) {
        return this.templates[id];
    }
    
    getAllTemplates() {
        return Object.keys(this.templates).map(key => ({
            id: key,
            ...this.templates[key]
        }));
    }
    
    applyTemplate(templateId, variables = {}) {
        const template = this.getTemplate(templateId);
        if (!template) return null;
        
        let body = template.body;
        let subject = template.subject;
        
        // Replace variables
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            body = body.replace(regex, variables[key]);
            subject = subject.replace(regex, variables[key]);
        });
        
        // Highlight any missing variables
        body = body.replace(/{{(\w+)}}/g, '<mark style="background: yellow; color: black;">[$1]</mark>');
        subject = subject.replace(/{{(\w+)}}/g, '[$1]');
        
        return { subject, body };
    }
    
    insertIntoEditor(templateId, editorCore, variables = {}) {
        if (!editorCore || !editorCore.editor) return;
        
        const processed = this.applyTemplate(templateId, variables);
        if (!processed) return;
        
        // Set the template content
        editorCore.setHTML(processed.body);
        
        // Update subject if possible
        const subjectField = document.getElementById('emailSubject');
        if (subjectField) {
            subjectField.textContent = processed.subject;
        }
        
        return processed;
    }
}