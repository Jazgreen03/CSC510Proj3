package FoodSeer.security;

import java.util.HashSet;
import java.util.Set;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import FoodSeer.entity.User;
import FoodSeer.repositories.UserRepository;
import lombok.AllArgsConstructor;

/**
 * Supports finding and logging in a user by username or email.
 */
@Service
@AllArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    /** Link to userRepository */
    private UserRepository userRepository;

    /**
     * Returns UserDetails for the user associated with the username or email
     * address.
     *
     * @param usernameOrEmail
     *            username or email to search for
     * @return UserDetails object representing the user.
     */
    @Override
    public UserDetails loadUserByUsername ( final String usernameOrEmail ) throws UsernameNotFoundException {
        // Just trim, don't force lowercase here so we can match what user typed if needed, 
        // but rely on repository case-insensitive search.
        String trimmed = usernameOrEmail.trim();
        System.out.println("Loading user by identifier: '" + trimmed + "'");

        final User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase( trimmed, trimmed )
                .orElseThrow( () -> new UsernameNotFoundException(
                        "User " + trimmed + " does not exist with the given username or email." ) );
        final Set<GrantedAuthority> authorities = new HashSet<GrantedAuthority>();
        authorities.add( new SimpleGrantedAuthority( user.getRole() ) );

    // Use the actual username from the user entity as the principal name so
    // downstream calls that lookup by username (e.g. getCurrentUser) work
    // whether the user logged in with a username or an email.
    return new org.springframework.security.core.userdetails.User( user.getUsername(), user.getPassword(),
        authorities );
    }
}
