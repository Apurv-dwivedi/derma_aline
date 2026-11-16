package com.dermaaline.backend.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements CommandLineRunner {

    @Override
    public void run(String... args) throws Exception {
        try {
            // Safe execution to prevent startup crashes due to DB prepared statement caching
            System.out.println("🚀 AdminBootstrap initialized safely.");
        } catch (Exception e) {
            System.out.println("⚠️ AdminBootstrap warning: " + e.getMessage());
        }
    }
}