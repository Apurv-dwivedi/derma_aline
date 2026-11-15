package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.ContactMessage;
import com.dermaaline.backend.repository.ContactRepository;
import com.dermaaline.backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contact")
@CrossOrigin(origins = "http://localhost:5173")
public class ContactController {

    @Autowired
    private ContactRepository contactRepository;

    @Autowired
    private EmailService emailService;

    @GetMapping
    public List<ContactMessage> getAllMessages() {
        return contactRepository.findAll();
    }

    @PostMapping
    public ContactMessage createMessage(@RequestBody ContactMessage contactMessage) {
        ContactMessage savedMessage = contactRepository.save(contactMessage);

        try {
            String subject = "New Contact Query from " + savedMessage.getName();
            String body = "You received a new message through the website contact form:\n\n" +
                          "Name: " + savedMessage.getName() + "\n" +
                          "Email: " + savedMessage.getEmail() + "\n" +
                          "Phone: " + savedMessage.getPhone() + "\n" +
                          "Message:\n" + savedMessage.getMessage();

            emailService.sendEmail("admin@dermaaline.com", subject, body);
        } catch (Exception e) {
            System.err.println("Error sending contact email: " + e.getMessage());
        }

        return savedMessage;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id) {
        try {
            if (contactRepository.existsById(id)) {
                contactRepository.deleteById(id);
                return ResponseEntity.ok().body("Deleted successfully");
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error deleting message: " + e.getMessage());
        }
    }
}