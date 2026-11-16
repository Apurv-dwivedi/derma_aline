package com.dermaaline.backend.controller;

import com.dermaaline.backend.entity.Treatment;
import com.dermaaline.backend.repository.TreatmentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class TreatmentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private TreatmentRepository treatmentRepository;

    @InjectMocks
    private TreatmentController treatmentController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(treatmentController).build();
    }

    @Test
    void testGetActiveTreatments() throws Exception {
        Treatment t1 = new Treatment();
        t1.setId(1L);
        t1.setName("Laser Hair Reduction");
        t1.setActive(true);

        when(treatmentRepository.findByActiveTrue()).thenReturn(List.of(t1));

        mockMvc.perform(get("/api/treatments/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Laser Hair Reduction"));
    }

    @Test
    void testCreateTreatment() throws Exception {
        Treatment t = new Treatment();
        t.setName("Carbon Laser Peel");
        t.setPrice(2500.0);
        t.setDurationMinutes(45);

        Treatment saved = new Treatment();
        saved.setId(12L);
        saved.setName("Carbon Laser Peel");

        when(treatmentRepository.save(any(Treatment.class))).thenReturn(saved);

        mockMvc.perform(post("/api/treatments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(t)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.id").value(12));
    }

    @Test
    void testDeleteTreatment() throws Exception {
        when(treatmentRepository.existsById(3L)).thenReturn(true);

        mockMvc.perform(delete("/api/treatments/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(treatmentRepository, times(1)).deleteById(3L);
    }
}
