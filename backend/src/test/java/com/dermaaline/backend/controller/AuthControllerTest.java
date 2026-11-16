package com.dermaaline.backend.controller;

import com.dermaaline.backend.dto.RegisterRequest;
import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthController authController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController).build();
    }

    @Test
    void testRegisterSuccess() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("newuser@derma.com");
        request.setPassword("Secret123");
        request.setFullName("John Doe");

        User savedUser = new User();
        savedUser.setId(1L);
        savedUser.setEmail("newuser@derma.com");
        savedUser.setFullName("John Doe");
        savedUser.setRole(User.Role.CUSTOMER);

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Secret123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.email").value("newuser@derma.com"));

        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void testRegisterDuplicateEmail() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@derma.com");
        request.setPassword("Secret123");

        User existingUser = new User();
        existingUser.setEmail("existing@derma.com");

        when(userRepository.findByEmail("existing@derma.com")).thenReturn(Optional.of(existingUser));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Email is already registered"));
    }

    @Test
    void testLoginSuccess() throws Exception {
        User user = new User();
        user.setEmail("admin@derma.com");
        user.setPassword("encodedPassword");
        user.setFullName("Admin User");
        user.setRole(User.Role.SUPER_ADMIN);

        when(userRepository.findByEmail("admin@derma.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123", "encodedPassword")).thenReturn(true);

        Map<String, String> credentials = Map.of("email", "admin@derma.com", "password", "Password123");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.role").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$.fullName").value("Admin User"));
    }

    @Test
    void testLoginWrongPassword() throws Exception {
        User user = new User();
        user.setEmail("admin@derma.com");
        user.setPassword("encodedPassword");

        when(userRepository.findByEmail("admin@derma.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPassword", "encodedPassword")).thenReturn(false);

        Map<String, String> credentials = Map.of("email", "admin@derma.com", "password", "WrongPassword");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testChangePasswordSuccess() throws Exception {
        User user = new User();
        user.setEmail("user@derma.com");
        user.setPassword("oldEncoded");

        when(userRepository.findByEmail("user@derma.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPass", "oldEncoded")).thenReturn(true);
        when(passwordEncoder.encode("newPass")).thenReturn("newEncoded");

        Map<String, String> payload = Map.of(
            "email", "user@derma.com",
            "oldPassword", "oldPass",
            "newPassword", "newPass"
        );

        mockMvc.perform(post("/api/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(userRepository, times(1)).save(user);
    }
}
