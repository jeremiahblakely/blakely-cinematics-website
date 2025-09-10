// admin-app.js - Main application initializer for Admin Mail
// Path: /js/admin-app.js
// Created: December 17, 2024

import MailController from '../modules/admin/controllers/MailController.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Blakely Admin Mail...');
    
    try {
        const mailController = new MailController();
        
        // Bind global functions
        if (window.initMailFunctions) {
            window.initMailFunctions(mailController);
        }
        
        window.mailController = mailController;
        
        console.log('Admin Mail initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Admin Mail:', error);
    }
});