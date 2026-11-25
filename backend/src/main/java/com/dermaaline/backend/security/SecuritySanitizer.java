package com.dermaaline.backend.security;

import java.util.regex.Pattern;

/**
 * Enterprise Security Input Sanitizer.
 * Defends against Cross-Site Scripting (XSS), HTML Injection, Null Byte injection,
 * and malicious payload formatting.
 */
public final class SecuritySanitizer {

    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]*>", Pattern.DOTALL);
    private static final Pattern SCRIPT_PATTERN = Pattern.compile("(?i)<script.*?>.*?</script.*?>|javascript:|data:text/html", Pattern.DOTALL);
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,10}$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[+0-9\\s()-]{7,25}$");
    private static final Pattern DATA_IMAGE_PATTERN = Pattern.compile("^data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\\r\\n]+$", Pattern.CASE_INSENSITIVE);
    private static final Pattern HTTPS_URL_PATTERN = Pattern.compile("^https://[^\\s<>\"']+$", Pattern.CASE_INSENSITIVE);
    private static final Pattern RELATIVE_PATH_PATTERN = Pattern.compile("^/[A-Za-z0-9._~!$&'()*+,;=:@/-]+$");

    private SecuritySanitizer() {
        // Utility class
    }

    /**
     * Sanitizes general text by stripping HTML tags, scripts, control characters,
     * and enforcing a hard length constraint.
     */
    public static String sanitizeText(String input, int maxLength) {
        if (input == null) {
            return null;
        }
        String clean = input.trim();
        // Remove null bytes and control chars
        clean = CONTROL_CHARS.matcher(clean).replaceAll("");
        // Remove script tags and dangerous protocols
        clean = SCRIPT_PATTERN.matcher(clean).replaceAll("");
        // Strip any HTML tags
        clean = HTML_TAG_PATTERN.matcher(clean).replaceAll("");
        // Normalize whitespace
        clean = clean.trim();
        // Truncate to maximum allowed length to prevent buffer/payload bloat
        if (clean.length() > maxLength) {
            clean = clean.substring(0, maxLength).trim();
        }
        return clean;
    }

    /**
     * Sanitizes and validates an email address.
     * Returns normalized lower-case email or null if invalid.
     */
    public static String sanitizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String clean = sanitizeText(email, 120);
        if (clean == null || !EMAIL_PATTERN.matcher(clean).matches()) {
            return null;
        }
        return clean.toLowerCase();
    }

    /**
     * Sanitizes and validates a phone number.
     * Strips non-standard characters, allowing only digits, plus, spaces, hyphens, and parentheses.
     */
    public static String sanitizePhone(String phone) {
        if (phone == null) {
            return null;
        }
        String clean = sanitizeText(phone, 25);
        if (clean == null || !PHONE_PATTERN.matcher(clean).matches()) {
            return null;
        }
        return clean;
    }

    /**
     * Validates and sanitizes an image URL or base64 image payload (blocks javascript:, data:text/html, SVG scripts).
     */
    public static String sanitizeImageUrl(String input, int maxLength) {
        if (input == null) {
            return null;
        }
        String trimmed = CONTROL_CHARS.matcher(input.trim()).replaceAll("");
        if (trimmed.isEmpty()) {
            return "";
        }
        if (trimmed.length() > maxLength) {
            return null;
        }
        if (SCRIPT_PATTERN.matcher(trimmed).find()) {
            return null;
        }
        if (DATA_IMAGE_PATTERN.matcher(trimmed).matches()
                || HTTPS_URL_PATTERN.matcher(trimmed).matches()
                || RELATIVE_PATH_PATTERN.matcher(trimmed).matches()) {
            return trimmed;
        }
        return null;
    }

    /**
     * Sanitizes an external/navigation URL to allow only safe https:// or relative paths.
     */
    public static String sanitizeSafeUrl(String input, int maxLength) {
        if (input == null) {
            return null;
        }
        String trimmed = CONTROL_CHARS.matcher(input.trim()).replaceAll("");
        if (trimmed.isEmpty()) {
            return "";
        }
        if (trimmed.length() > maxLength) {
            return null;
        }
        if (HTTPS_URL_PATTERN.matcher(trimmed).matches() || RELATIVE_PATH_PATTERN.matcher(trimmed).matches()) {
            return trimmed;
        }
        return null;
    }

    /**
     * Masks an email address for privacy-preserving logs (e.g., ap***@gmail.com).
     */
    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "[redacted]";
        }
        String trimmed = email.trim();
        int atIdx = trimmed.indexOf('@');
        if (atIdx <= 1) {
            return "***" + (atIdx >= 0 ? trimmed.substring(atIdx) : "");
        }
        String prefix = trimmed.substring(0, Math.min(2, atIdx));
        return prefix + "***" + trimmed.substring(atIdx);
    }
}
