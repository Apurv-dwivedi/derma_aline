package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Customer;
import com.dermaaline.backend.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "*")
public class CustomerController {

    @Autowired
    private CustomerRepository customerRepository;

    @GetMapping
    public ResponseEntity<List<Customer>> getAllCustomers() {
        return ResponseEntity.ok(customerRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCustomerById(@PathVariable Long id) {
        Optional<Customer> customer = customerRepository.findById(id);
        if (customer.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Customer not found"));
        }
        return ResponseEntity.ok(customer.get());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCustomer(@PathVariable Long id, @RequestBody Customer details) {
        Optional<Customer> opt = customerRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Customer not found"));
        }
        Customer c = opt.get();
        c.setFullName(details.getFullName());
        c.setEmail(details.getEmail());
        c.setPhone(details.getPhone());
        c.setNotes(details.getNotes());

        customerRepository.save(c);
        return ResponseEntity.ok(Map.of("success", true, "message", "Customer updated successfully"));
    }
}