<template>
  <div class="row justify-center">
    <div class="authenticator__form">
      <q-card>
        <q-card-section>
          <div class="text-h5">{{ isSignUp ? 'Sign Up' : 'Sign In' }}</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="email"
            label="Email"
            type="email"
            outlined
            :error="!!errors.email"
            :error-message="errors.email"
          />
          <q-input
            v-model="password"
            label="Password"
            :type="showPassword ? 'text' : 'password'"
            outlined
            class="q-mt-md"
            :error="!!errors.password"
            :error-message="errors.password"
          >
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility' : 'visibility_off'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <div v-if="errors.general" class="text-negative q-mt-sm">
            {{ errors.general }}
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            :label="isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'"
            @click="toggleMode"
          />
          <q-btn
            :label="isSignUp ? 'Sign Up' : 'Sign In'"
            color="primary"
            @click="handleSubmit"
            :loading="loading"
          />
        </q-card-actions>
      </q-card>
    </div>
  </div>
</template>

<script>
import { Auth } from "../shared/api";

/**
 * Authentication view authenticates a customer and redirects to desired page if successful
 * Non-authenticated users are redirected to this view via Route Guards
 */
export default {
  name: "Authentication",
  /**
   * @param {string} redirectTo - Sets Route one must go once authenticated
   */
  props: {
    redirectTo: String
  },
  data() {
    return {
      email: "",
      password: "",
      showPassword: false,
      isSignUp: false,
      loading: false,
      errors: {
        email: "",
        password: "",
        general: ""
      }
    };
  },
  methods: {
    toggleMode() {
      this.isSignUp = !this.isSignUp;
      this.clearErrors();
    },
    clearErrors() {
      this.errors = {
        email: "",
        password: "",
        general: ""
      };
    },
    validateForm() {
      this.clearErrors();
      let valid = true;

      if (!this.email) {
        this.errors.email = "Email is required";
        valid = false;
      }

      if (!this.password) {
        this.errors.password = "Password is required";
        valid = false;
      } else if (this.password.length < 6) {
        this.errors.password = "Password must be at least 6 characters";
        valid = false;
      }

      return valid;
    },
    async handleSubmit() {
      if (!this.validateForm()) {
        return;
      }

      this.loading = true;
      this.clearErrors();

      try {
        if (this.isSignUp) {
          await Auth.signUp({
            username: this.email,
            password: this.password,
            attributes: {}
          });
          // After successful sign up, automatically sign in
          await this.signIn();
        } else {
          await this.signIn();
        }
      } catch (error) {
        this.errors.general = error.message || "Authentication failed";
        this.loading = false;
      }
    },
    async signIn() {
      try {
        await Auth.signIn(this.email, this.password);
        await this.$store.dispatch("profile/getSession");
        
        // Redirect to desired page
        const redirectRoute = this.redirectTo || "home";
        this.$router.push({ name: redirectRoute });
      } catch (error) {
        throw error;
      }
    }
  }
};
</script>

<style lang="stylus">
@import '~variables'

:root
  --color-primary $primary !important

.authenticator__form
  @media only screen and (min-device-width: 700px)
    margin auto
    padding 15vmin

  > *
    font-family 'Raleway', 'Open Sans', sans-serif

  @media only screen and (min-device-width: 300px) and (max-device-width: 700px)
    > div
      min-width 80vw
      padding 10vmin
</style>
