package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Customer;
import com.dermaaline.backend.repository.CustomerRepository;
import com.dermaaline.backend.repository.TreatmentRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping({"/api/admin/clients", "/api/customers"})
public class CustomerController {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TreatmentRecordRepository treatmentRecordRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllCustomers(@RequestParam(required = false) String search) {
        List<Customer> list = customerRepository.findAll();
        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            list = list.stream()
                    .filter(c -> (c.getFullName() != null && c.getFullName().toLowerCase().contains(q)) ||
                                 (c.getEmail() != null && c.getEmail().toLowerCase().contains(q)) ||
                                 (c.getPhone() != null && c.getPhone().contains(q)))
                    .toList();
        }

        List<Map<String, Object>> response = new ArrayList<>();
        for (Customer c : list) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("fullName", c.getFullName());
            map.put("email", c.getEmail());
            map.put("phone", c.getPhone());
            map.put("notes", c.getNotes());
            map.put("createdAt", c.getCreatedAt());

            long count = 0;
            if (c.getEmail() != null && !c.getEmail().trim().isEmpty()) {
                try {
                    count = treatmentRecordRepository.findByCustomerEmailIgnoreCaseOrderByTreatmentDateDesc(c.getEmail().trim()).size();
                } catch (Exception ignored) {}
            }
            map.put("treatmentCount", count);
            response.add(map);
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCustomerById(@PathVariable Long id) {
        Optional<Customer> customerOpt = customerRepository.findById(id);
        if (customerOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Customer not found"));
        }
        Customer c = customerOpt.get();
        Map<String, Object> res = new HashMap<>();
        res.put("customer", c);
        res.put("treatments", treatmentRecordRepository.findByCustomerEmailIgnoreCaseOrderByTreatmentDateDesc(c.getEmail()));
        return ResponseEntity.ok(res);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCustomer(@PathVariable Long id, @RequestBody Customer details) {
        Optional<Customer> opt = customerRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "message", "Customer not found"));
        }
        Customer c = opt.get();
        if (details.getFullName() != null) c.setFullName(details.getFullName().trim());
        if (details.getPhone() != null) c.setPhone(details.getPhone().trim());
        if (details.getNotes() != null) c.setNotes(details.getNotes());

        customerRepository.save(c);
        return ResponseEntity.ok(Map.of("success", true, "message", "Customer profile updated successfully"));
    }
}
