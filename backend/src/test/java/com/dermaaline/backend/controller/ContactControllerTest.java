package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.ContactMessage;
import com.dermaaline.backend.entity.ContactStatus;
import com.dermaaline.backend.repository.ContactRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class ContactControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ContactRepository contactRepository;

    @InjectMocks
    private ContactController contactController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(contactController).build();
    }

    @Test
    void testContactSubmissionSanitizesXssAndForcesUnreadStatus() throws Exception {
        when(contactRepository.save(any(ContactMessage.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, String> payload = Map.of(
                "name", "Aarav <script>alert('xss')</script> Verma",
                "email", "  Aarav@Example.COM ",
                "phone", "+91 98111 22334<img src=x onerror=alert(1)>",
                "message", "Interested in <script>evil()</script> HydraFacial glow pricing.",
                "status", "RESOLVED"
        );

        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        ArgumentCaptor<ContactMessage> captor = ArgumentCaptor.forClass(ContactMessage.class);
        verify(contactRepository).save(captor.capture());

        ContactMessage saved = captor.getValue();
        assertFalse(saved.getName().contains("<script>"));
        assertFalse(saved.getMessage().contains("<script>"));
        assertEquals("aarav@example.com", saved.getEmail());
        assertEquals("+91 98111 22334", saved.getPhone());
        assertEquals(ContactStatus.UNREAD, saved.getStatus());
    }

    @Test
    void testContactSubmissionRejectsInvalidEmailOrBlankMessage() throws Exception {
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "name", "Aarav",
                        "email", "not-an-email",
                        "phone", "9811122334",
                        "message", "Hello clinic"
                ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verify(contactRepository, never()).save(any());
    }
}
