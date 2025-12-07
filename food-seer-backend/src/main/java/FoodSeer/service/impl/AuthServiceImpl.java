package FoodSeer.service.impl;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import FoodSeer.dto.AuthResponseDto;
import FoodSeer.dto.LoginRequestDto;
import FoodSeer.dto.RegisterRequestDto;
import FoodSeer.entity.User;
import FoodSeer.repositories.UserRepository;
import FoodSeer.security.JwtTokenProvider;
import FoodSeer.service.AuthService;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class AuthServiceImpl implements AuthService {

    @Autowired
    private UserRepository        userRepository;

    private PasswordEncoder       passwordEncoder;
    private AuthenticationManager authManager;
    private JwtTokenProvider      jwtService;

    @Override
    public ResponseEntity<Map<String, String>> register ( final RegisterRequestDto req ) {
        String username = req.username().trim().toLowerCase();
        String email = req.email().trim().toLowerCase();
        
        System.out.println("Processing registration for username: '" + username + "', email: '" + email + "'");

        // Username checks
        if ( userRepository.existsByUsername( username ) ) {
            return ResponseEntity.badRequest().body( Map.of( "error", "Username already taken" ) );
        }
        if ( username.length() > 50 || username.length() < 3 ){
            return ResponseEntity.badRequest().body( Map.of( "error", "Username must be between 3-50 characters" ) );
        }
        for(Character c : username.toCharArray()){
            if(!Character.isAlphabetic(c) && c != '_' && c != '-'){
                return ResponseEntity.badRequest().body( Map.of( "error", "Username must only contain letters, -, and _" ) );
            }
        }
        
        // Password checks
        if ( req.password().length() < 2 || req.password().length() > 128){
            return ResponseEntity.badRequest().body( Map.of( "error", "Password must be longer than 8 characters" ) );
        }

        // Email checks
        if ( email.length() > 254 ||  !email.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")){
            return ResponseEntity.badRequest().body( Map.of( "error", "Invalid email format" ) );
        }
        
        final String hash = passwordEncoder.encode( req.password() );
        final User hashedUser = new User( req, hash );
        hashedUser.setUsername(username);
        hashedUser.setEmail(email);
        
        userRepository.save( hashedUser );
        System.out.println("User registered successfully: " + username);
        return ResponseEntity.ok( Map.of( "message", "Registered" ) );
    }

    @Override
    public ResponseEntity<AuthResponseDto> login ( final LoginRequestDto req ) {
        // Only trim, let CustomUserDetailsService handle case-insensitive lookup
        String loginIdentifier = req.username().trim();
        System.out.println("Processing login for identifier: '" + loginIdentifier + "'");

        final UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken( loginIdentifier,
                req.password() );
        final Authentication authentication = authManager.authenticate( auth );

        final String token = jwtService.generateToken( authentication );
        return ResponseEntity.ok( new AuthResponseDto( token ) );
    }
}
