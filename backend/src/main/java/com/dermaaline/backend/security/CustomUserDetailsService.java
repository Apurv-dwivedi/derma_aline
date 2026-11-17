package com.dermaaline.backend.security;

import com.dermaaline.backend.entity.User;
import com.dermaaline.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if (email == null || email.trim().isEmpty()) {
            throw new UsernameNotFoundException("Empty email provided");
        }

        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        boolean enabled = user.getStatus() != User.AccountStatus.DISABLED;

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        User.Role role = user.getRole() != null ? user.getRole() : User.Role.CUSTOMER;
        String roleName = role.name().toUpperCase();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + roleName));

        if ("SUPER_ADMIN".equals(roleName)) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        } else if ("ADMIN".equals(roleName)) {
            authorities.add(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"));
        } else if ("PATIENT".equals(roleName)) {
            authorities.add(new SimpleGrantedAuthority("ROLE_CUSTOMER"));
        }

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword() != null ? user.getPassword() : "",
                enabled,
                true,
                true,
                true,
                authorities
        );
    }
}
