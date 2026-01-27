import React from 'react';
import { API } from '../services/apiService';
import { Redirect } from 'react-router';
import { Glyphicon } from 'react-bootstrap';

interface AddToCartProps {
  bookId: string;
  price: number;
  variant?: string;
}

interface AddToCartState {
  loading: boolean;
  toCart: boolean;
}

class AddToCart extends React.Component<AddToCartProps, AddToCartState> {
  constructor(props: AddToCartProps) {
    super(props);

    this.state = {
      loading: false,
      toCart: false
    };
  }

  onAddToCart = async () => {
    this.setState({ loading: true });
    
    try {
      // Check if book already exists in cart
      const bookInCart = await API.get("cart", `/cart/${this.props.bookId}`, null);
      
      // if the book already exists in the cart, increase the quantity
      await API.put("cart", "/cart", {
        body: {
          bookId: this.props.bookId,
          quantity: bookInCart.quantity + 1
        }
      });
      
      this.setState({ toCart: true });
    } catch (error) {
      // Book not in cart (404 error is expected), add it as new item
      try {
        await API.post("cart", "/cart", {
          body: {
            bookId: this.props.bookId,
            price: this.props.price,
            quantity: 1,
          }
        });
        
        this.setState({ toCart: true });
      } catch (addError) {
        console.error('Error adding to cart:', addError);
        alert('Failed to add item to cart. Please try again.');
        this.setState({ loading: false });
      }
    }
  }

  getVariant = () => {
    let style = "btn btn-black"
    return this.props.variant && this.props.variant === "center" ? style + ` btn-black-center` : style + ` pull-right`;
  }

  render() {
    if (this.state.toCart) return <Redirect to='/cart' />
    
    return (
      <button 
        className={this.getVariant()} 
        disabled={this.state.loading}
        type="button" 
        onClick={this.onAddToCart}>
        {this.state.loading && <Glyphicon glyph="refresh" className="spinning" />}
        {this.props.variant === "buyAgain" ? `Buy again` : `Add to cart`}
      </button>
    );
  }
}

export default AddToCart;