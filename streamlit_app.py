import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import struct

def decimal_to_binary_float(decimal_num, precision=23):
    """
    Convert decimal to binary representation showing the process
    """
    if decimal_num == 0:
        return "0.0", "0" * (precision + 8)
    
    # Get the IEEE 754 representation
    binary_repr = format(struct.unpack('!I', struct.pack('!f', decimal_num))[0], '032b')
    
    # Extract sign, exponent, and mantissa
    sign = binary_repr[0]
    exponent = binary_repr[1:9]
    mantissa = binary_repr[9:]
    
    # Manual conversion for visualization
    integer_part = int(decimal_num)
    fractional_part = decimal_num - integer_part
    
    # Convert integer part
    if integer_part == 0:
        integer_binary = "0"
    else:
        integer_binary = bin(integer_part)[2:]
    
    # Convert fractional part
    fractional_binary = ""
    original_fractional = fractional_part
    max_iterations = 50
    iteration = 0
    
    while fractional_part > 0 and iteration < max_iterations:
        fractional_part *= 2
        if fractional_part >= 1:
            fractional_binary += "1"
            fractional_part -= 1
        else:
            fractional_binary += "0"
        iteration += 1
    
    if iteration >= max_iterations:
        fractional_binary += "..."
    
    visual_binary = f"{integer_binary}.{fractional_binary}"
    
    return visual_binary, binary_repr

def perform_float_addition(num1, num2):
    """
    Perform floating point addition and show the actual result
    """
    result = num1 + num2
    expected = num1 + num2
    return result, expected

def create_binary_visualization(decimal_val, binary_str, title):
    """
    Create a visualization of binary representation
    """
    fig = go.Figure()
    
    # Create binary digit visualization
    digits = list(binary_str.replace(".", "").replace("...", ""))
    positions = list(range(len(digits)))
    
    colors = ['lightblue' if d == '0' else 'darkblue' for d in digits]
    
    fig.add_trace(go.Bar(
        x=positions,
        y=[1] * len(digits),
        text=digits,
        textposition='inside',
        marker_color=colors,
        name=f'{decimal_val} in binary'
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Bit Position",
        yaxis_title="",
        showlegend=False,
        height=200,
        yaxis=dict(showticklabels=False)
    )
    
    return fig

def create_error_visualization(original_nums, result, expected):
    """
    Create visualization showing the calculation error
    """
    fig = go.Figure()
    
    categories = ['Expected Result', 'Actual Result', 'Error']
    values = [expected, result, abs(result - expected)]
    colors = ['green', 'red', 'orange']
    
    fig.add_trace(go.Bar(
        x=categories,
        y=values,
        marker_color=colors,
        text=[f'{v:.17f}' for v in values],
        textposition='outside'
    ))
    
    fig.update_layout(
        title='Calculation Results and Error',
        yaxis_title='Value',
        height=400
    )
    
    return fig

# Streamlit App
st.set_page_config(
    page_title="演算誤差",
    page_icon="🔢",
    layout="wide"
)

st.title("演算誤差（pp.191-192）")
st.caption("Created by Dit-Lab.(Daiki ITO)")
st.caption("Supported by Tomoaki ATSUMI")

st.markdown("""
このアプリケーションでは、コンピュータが小数の計算を行う際に発生する **演算誤差** を可視化し、
なぜこのような誤差が生じるのかを段階的に学ぶことができます。
""")

# Input section
st.header("📝 計算する小数を入力してください")

col1, col2 = st.columns(2)

with col1:
    num1 = st.number_input(
        "小数1を入力 (0-1の範囲推奨)",
        value=0.1,
        format="%.3f",
        step=0.001,
        key="num1"
    )

with col2:
    num2 = st.number_input(
        "小数2を入力 (0-1の範囲推奨)", 
        value=0.2,
        format="%.3f",
        step=0.001,
        key="num2"
    )

if st.button("🚀 計算実行", type="primary"):
    st.divider()
    
    # Step 1: Decimal to Binary Conversion
    st.header("ステップ1: 10進数から2進数への変換")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader(f"数値1: {num1}")
        binary1, ieee_binary1 = decimal_to_binary_float(num1)
        st.code(f"10進数: {num1}")
        st.code(f"2進数: {binary1}")
        
        if "..." in binary1:
            st.warning("⚠️ この小数は2進数では循環小数となり、無限に続きます！")
        
        # Visualization
        fig1 = create_binary_visualization(num1, binary1[:20], f"{num1} の2進数表現")
        st.plotly_chart(fig1, use_container_width=True)
    
    with col2:
        st.subheader(f"数値2: {num2}")
        binary2, ieee_binary2 = decimal_to_binary_float(num2)
        st.code(f"10進数: {num2}")
        st.code(f"2進数: {binary2}")
        
        if "..." in binary2:
            st.warning("⚠️ この小数は2進数では循環小数となり、無限に続きます！")
        
        # Visualization
        fig2 = create_binary_visualization(num2, binary2[:20], f"{num2} の2進数表現")
        st.plotly_chart(fig2, use_container_width=True)
    
    st.divider()
    
    # Step 2: Bit Rounding
    st.header("ステップ2: ビット列の丸め")
    st.markdown("""
    コンピュータのメモリには限りがあるため、無限に続く2進数を**32ビット**または**64ビット**で切り捨てる必要があります。
    この切り捨て（丸め）によって、元の数値を完全に正確には表現できなくなります。
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.code(f"IEEE 754 (32bit): {ieee_binary1}")
        # Convert back to see the rounded value
        rounded_num1 = struct.unpack('!f', struct.pack('!I', int(ieee_binary1, 2)))[0]
        st.info(f"丸め後の実際の値: {rounded_num1:.17f}")
    
    with col2:
        st.code(f"IEEE 754 (32bit): {ieee_binary2}")
        rounded_num2 = struct.unpack('!f', struct.pack('!I', int(ieee_binary2, 2)))[0]
        st.info(f"丸め後の実際の値: {rounded_num2:.17f}")
    
    st.divider()
    
    # Step 3: Calculation
    st.header("ステップ3: 演算の実行")
    st.markdown("丸められた2進数同士で加算を実行します。")
    
    result, expected = perform_float_addition(num1, num2)
    
    # Step 4: Result and Error Analysis
    st.header("ステップ4: 結果と誤差の分析")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # Error visualization
        fig_error = create_error_visualization([num1, num2], result, expected)
        st.plotly_chart(fig_error, use_container_width=True)
    
    with col2:
        st.metric(
            label="期待される結果",
            value=f"{expected:.17f}"
        )
        st.metric(
            label="実際の計算結果", 
            value=f"{result:.17f}",
            delta=f"{result - expected:.2e}"
        )
        
        error_magnitude = abs(result - expected)
        if error_magnitude > 0:
            st.error(f"💥 誤差が発生しました！\n誤差の大きさ: {error_magnitude:.2e}")
        else:
            st.success("✅ 正確な計算結果です")
    
    st.divider()
    
    # Explanation and Solutions
    st.header("🔍 なぜ誤差が発生するのか？")
    
    st.markdown("""
    ### 原因
    1. **10進小数の2進表現の限界**: 0.1や0.2のような10進数の小数は、2進数では循環小数となり正確に表現できません。
    2. **メモリ制約による丸め**: コンピュータは有限のビット数で数値を保存するため、無限に続く2進数を途中で切り捨てる必要があります。
    3. **累積する微小誤差**: この微小な誤差が計算を重ねることで蓄積していきます。
    """)
    
    st.header("💡 対策方法")
    
    st.markdown("""
    ### 1. 整数演算を活用する方法
    小数を一時的に整数に変換してから計算し、最後に元の位に戻す方法です。
    """)
    
    # Demonstrate integer solution
    with st.expander("整数演算による解決例を見る"):
        st.code(f"""
# 誤差のある計算
result_with_error = {num1} + {num2}  # = {result:.17f}

# 整数演算による正確な計算  
num1_int = {num1} * 10  # = {num1 * 10}
num2_int = {num2} * 10  # = {num2 * 10}
result_int = num1_int + num2_int  # = {(num1 * 10) + (num2 * 10)}
accurate_result = result_int / 10  # = {((num1 * 10) + (num2 * 10)) / 10}
""")
        
        accurate_result = ((num1 * 10) + (num2 * 10)) / 10
        st.success(f"整数演算による正確な結果: {accurate_result}")
    
    st.markdown("""
    ### 2. その他の対策
    - **Decimal型の使用**: PythonのDecimalモジュールなど、任意精度演算ライブラリを使用
    - **適切な丸め処理**: 計算結果を表示する際に適切な桁数で丸める
    - **誤差を考慮した比較**: 浮動小数点数の比較時にイプシロン（許容誤差）を設ける
    """)
    
    st.info("""
    💭 **まとめ**: コンピュータの計算は必ずしも数学的に正確ではありません。
    プログラムを書く際は、この特性を理解し、用途に応じた適切な対策を講じることが重要です。
    """)

# Interactive learning section
st.divider()
st.header("🎮 その他の例で試してみよう")

st.markdown("""
さまざまな値で試して、どのような場合に誤差が大きくなるか確認してみましょう！

**試してみる値の例:**
- 0.1 + 0.2
- 0.3 + 0.6  
- 0.123 + 0.456
- 0.7 + 0.1
""")

# Footer
st.divider()
st.markdown("""
<div style='text-align: center; color: gray; font-size: 0.8em;'>
このアプリケーションを通じて、コンピュータサイエンスの重要な概念である「浮動小数点演算の限界」を理解していただけたでしょうか。<br>
プログラミングにおいて、この知識は予期しないバグを防ぐために非常に重要です。
</div>
""", unsafe_allow_html=True)
